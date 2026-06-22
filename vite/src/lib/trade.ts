import {
  ApprovalModes,
  DZapTransactionResponse,
  HexString,
  PermitTypes,
  Services,
  SignPermitResponse,
  TradeBuildTxnRequest,
  TxnStatus,
} from "@dzapio/sdk";
import type {
  DZapSigner,
  QuoteResult,
  SelectedTradeQuote,
  TradeApprovalMode,
  TradeParams,
  TradeQuoteOptions,
  TradeRequestData,
} from "../types/trade";
import { dZap } from "./client";
import { isGaslessSupportedToken } from "./token";

/**
 * Step 1 — Build trade leg(s) for the quote and build-tx endpoints.
 */
export function buildTradeRequestData(params: TradeParams): TradeRequestData[] {
  return [
    {
      amount: params.amount,
      srcToken: params.srcToken,
      ...(params.srcDecimals !== undefined && {
        srcDecimals: params.srcDecimals,
      }),
      destToken: params.destToken,
      ...(params.destDecimals !== undefined && {
        destDecimals: params.destDecimals,
      }),
      toChain: params.toChain,
      slippage: params.slippage,
      recipient: params.account,
    },
  ];
}

/**
 * Step 2 — Fetch quotes and return the recommended route + quote details.
 */
export async function fetchQuoteAndProtocol(
  params: TradeParams,
  requestData: TradeRequestData[],
  quoteOptions?: TradeQuoteOptions
): Promise<QuoteResult> {
  const quotes = await dZap.getTradeQuotes({
    fromChain: params.fromChain,
    data: requestData,
    account: params.account,
    ...quoteOptions,
  });

  const pairKey = Object.keys(quotes)[0];
  const protocol = quotes[pairKey]?.recommendedSource;
  if (!protocol) {
    throw new Error("No protocol found");
  }

  const quote = quotes[pairKey]?.quoteRates?.[protocol];
  if (!quote) {
    throw new Error(`No quote found for protocol: ${protocol}`);
  }

  return { quote, protocol };
}

/** A quote paired with its request legs, ready to show and then execute. */
export type PreparedTrade = {
  requestData: TradeRequestData[];
  quote: SelectedTradeQuote;
  protocol: string;
};

/**
 * Quote step — build the legs and fetch the recommended quote. Read-only: no
 * approvals or signatures. Run this before confirming the trade.
 */
export async function prepareTrade(
  params: TradeParams,
  quoteOptions?: TradeQuoteOptions
): Promise<PreparedTrade> {
  const requestData = buildTradeRequestData(params);
  const { quote, protocol } = await fetchQuoteAndProtocol(
    params,
    requestData,
    quoteOptions
  );
  return { requestData, quote, protocol };
}

/**
 * Step 3 — Attach protocol, permit signature, and quote metadata to each leg.
 */
export function buildTradeTxnRequest(
  requestData: TradeRequestData[],
  quote: SelectedTradeQuote,
  permitData: HexString | undefined,
  params: TradeParams,
  gasless: boolean
): TradeBuildTxnRequest {
  return {
    data: requestData.map((leg) => ({
      ...leg,
      protocol: quote.providerDetails.id,
      permitData,
      additionalInfo: {
        ...(quote.additionalInfo ?? {}),
      },
    })),
    fromChain: params.fromChain,
    gasless,
    refundee: params.account,
    sender: params.account,
  };
}

/**
 * Read the permit out of a signature response, throwing if the signature
 * failed or returned nothing — so a rejected permit stops the trade here
 * instead of failing later in the build with a confusing error.
 */
function getPermitDataOrThrow(response: SignPermitResponse): HexString {
  if (response.status !== TxnStatus.success || !("tokens" in response)) {
    throw new Error(`Permit signature failed (code ${response.code})`);
  }
  const permitData = response.tokens[0]?.permitData;
  if (!permitData) {
    throw new Error("Permit signature returned no permit data");
  }
  return permitData;
}

export async function signEIP2612Permit(
  signer: DZapSigner,
  params: TradeParams
): Promise<HexString> {
  const response = await dZap.sign({
    chainId: params.fromChain,
    sender: params.account,
    service: Services.trade,
    signer,
    tokens: [{ address: params.srcToken, amount: params.amount }],
    permitType: PermitTypes.EIP2612Permit,
  });

  return getPermitDataOrThrow(response);
}

export async function approveForPermit2(
  signer: DZapSigner,
  params: TradeParams
): Promise<void> {
  const response = await dZap.getAllowance({
    chainId: params.fromChain,
    sender: params.account,
    service: Services.trade,
    tokens: [{ address: params.srcToken, amount: params.amount }],
    mode: ApprovalModes.PermitSingle,
  });
  const tokenApproval = response.data[params.srcToken];
  if (!tokenApproval) {
    throw new Error(`No allowance data for token: ${params.srcToken}`);
  }
  const approvalNeeded = tokenApproval.allowance < BigInt(params.amount);
  if (!approvalNeeded) {
    return;
  }
  const result = await dZap.approve({
    chainId: params.fromChain,
    service: Services.trade,
    signer,
    tokens: [{ address: params.srcToken, amount: params.amount }],
    mode: ApprovalModes.PermitSingle,
  });

  // Abort the trade if the approval did not go through (e.g. user rejected).
  if (result.status !== TxnStatus.success) {
    throw new Error(`Permit2 approval failed (code ${result.code})`);
  }
}

export async function signPermit2Single(
  signer: DZapSigner,
  params: TradeParams
): Promise<HexString> {
  const response = await dZap.sign({
    chainId: params.fromChain,
    sender: params.account,
    service: Services.trade,
    signer,
    tokens: [{ address: params.srcToken, amount: params.amount }],
    permitType: PermitTypes.PermitSingle,
  });

  return getPermitDataOrThrow(response);
}

/** Execute via relayer using an EIP-2612 permit (no approval tx). */
export async function executeGaslessTrade(
  signer: DZapSigner,
  params: TradeParams,
  prepared: PreparedTrade
): Promise<DZapTransactionResponse> {
  const permitData = await signEIP2612Permit(signer, params);

  return dZap.tradeGasless({
    request: buildTradeTxnRequest(
      prepared.requestData,
      prepared.quote,
      permitData,
      params,
      true
    ),
    signer,
  });
}

/** Execute a standard on-chain trade with Permit2 approval + signature. */
export async function executeTradeWithPermit2(
  signer: DZapSigner,
  params: TradeParams,
  prepared: PreparedTrade
): Promise<DZapTransactionResponse> {
  await approveForPermit2(signer, params);
  const permitData = await signPermit2Single(signer, params);

  return dZap.trade({
    request: buildTradeTxnRequest(
      prepared.requestData,
      prepared.quote,
      permitData,
      params,
      false
    ),
    signer,
  });
}

/**
 * Check allowance and approve with Default mode when the user must send an
 * on-chain approval transaction before trading.
 */
export async function ensureDefaultApproval(
  signer: DZapSigner,
  params: TradeParams
): Promise<void> {
  const allowanceCheck = await dZap.getAllowance({
    chainId: params.fromChain,
    sender: params.account,
    tokens: [{ address: params.srcToken, amount: params.amount }],
    service: Services.trade,
    mode: ApprovalModes.Default,
  });

  const tokenApproval = allowanceCheck.data[params.srcToken];
  if (!tokenApproval) {
    throw new Error(`No allowance data for token: ${params.srcToken}`);
  }

  const approvalNeeded = tokenApproval.allowance < BigInt(params.amount);
  if (!approvalNeeded) {
    return;
  }

  const result = await dZap.approve({
    chainId: params.fromChain,
    signer,
    tokens: [{ address: params.srcToken, amount: params.amount }],
    service: Services.trade,
    mode: ApprovalModes.Default,
  });

  // Abort the trade if the approval did not go through (e.g. user rejected).
  if (result.status !== TxnStatus.success) {
    throw new Error(`Approval failed (code ${result.code})`);
  }
}

/**
 * Gas-backed trade (viem or ethers signer) from an already-fetched quote.
 *
 * - `default` — ERC-20 approve when allowance is insufficient
 * - `permit2` — Permit2 approval + PermitSingle signature
 */
export async function executeGasTrade(
  signer: DZapSigner,
  params: TradeParams,
  prepared: PreparedTrade,
  approvalMode: TradeApprovalMode
): Promise<DZapTransactionResponse> {
  if (approvalMode === "permit2") {
    return executeTradeWithPermit2(signer, params, prepared);
  }

  await ensureDefaultApproval(signer, params);

  return dZap.trade({
    request: {
      fromChain: params.fromChain,
      sender: params.account,
      refundee: params.account,
      gasless: false,
      data: [
        {
          amount: prepared.quote.srcAmount,
          srcToken: prepared.quote.srcToken.address,
          srcDecimals: prepared.quote.srcToken.decimals,
          destToken: prepared.quote.destToken.address,
          destDecimals: prepared.quote.destToken.decimals,
          toChain: params.toChain,
          protocol: prepared.protocol,
          recipient: params.account,
          slippage: params.slippage,
        },
      ],
    },
    signer,
  });
}

/** User-facing message from an SDK trade response. */
export function formatTradeResult(result: DZapTransactionResponse): string {
  if (result.status === "success" && result.txnHash) {
    return `Transaction successful: ${result.txnHash}`;
  }
  return `Transaction failed: ${result.error}`;
}

/**
 * Gasless trade from an already-fetched quote — uses the relayer when the
 * source token supports EIP-2612, otherwise falls back to a Permit2 trade.
 */
export async function executeGaslessTradeWithGasFallback(
  signer: DZapSigner,
  params: TradeParams,
  prepared: PreparedTrade
): Promise<DZapTransactionResponse> {
  const supportsGasless = await isGaslessSupportedToken(
    params.srcToken,
    params.fromChain
  );

  return supportsGasless
    ? executeGaslessTrade(signer, params, prepared)
    : executeTradeWithPermit2(signer, params, prepared);
}
