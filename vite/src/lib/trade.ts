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

function extractPermitSignature(
  response: SignPermitResponse
): HexString | undefined {
  if (response.status !== TxnStatus.success || !("tokens" in response)) {
    return undefined;
  }
  return response.tokens[0]?.permitData;
}

export async function signEIP2612Permit(
  signer: DZapSigner,
  params: TradeParams
): Promise<HexString | undefined> {
  const response = await dZap.sign({
    chainId: params.fromChain,
    sender: params.account,
    service: Services.trade,
    signer,
    tokens: [{ address: params.srcToken, amount: params.amount }],
    permitType: PermitTypes.EIP2612Permit,
  });

  return extractPermitSignature(response);
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
  await dZap.approve({
    chainId: params.fromChain,
    service: Services.trade,
    signer,
    tokens: [{ address: params.srcToken, amount: params.amount }],
    mode: ApprovalModes.PermitSingle,
  });
}

export async function signPermit2Single(
  signer: DZapSigner,
  params: TradeParams
): Promise<HexString | undefined> {
  const response = await dZap.sign({
    chainId: params.fromChain,
    sender: params.account,
    service: Services.trade,
    signer,
    tokens: [{ address: params.srcToken, amount: params.amount }],
    permitType: PermitTypes.PermitSingle,
  });

  return extractPermitSignature(response);
}

/** Execute via relayer using an EIP-2612 permit (no approval tx). */
export async function executeGaslessTrade(
  signer: DZapSigner,
  params: TradeParams,
  requestData: TradeRequestData[],
  quote: SelectedTradeQuote
): Promise<DZapTransactionResponse> {
  const permitData = await signEIP2612Permit(signer, params);

  return dZap.tradeGasless({
    request: buildTradeTxnRequest(requestData, quote, permitData, params, true),
    signer,
  });
}

/** Execute a standard on-chain trade with Permit2 approval + signature. */
export async function executeTradeWithPermit2(
  signer: DZapSigner,
  params: TradeParams,
  requestData: TradeRequestData[],
  quote: SelectedTradeQuote
): Promise<DZapTransactionResponse> {
  await approveForPermit2(signer, params);
  const permitData = await signPermit2Single(signer, params);

  return dZap.trade({
    request: buildTradeTxnRequest(
      requestData,
      quote,
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

  await dZap.approve({
    chainId: params.fromChain,
    signer,
    tokens: [{ address: params.srcToken, amount: params.amount }],
    service: Services.trade,
    mode: ApprovalModes.Default,
  });
}

/**
 * Gas-backed trade (viem or ethers signer).
 * Quote → authorize source token → execute on-chain trade.
 *
 * - `default` — ERC-20 approve when allowance is insufficient
 * - `permit2` — Permit2 approval + PermitSingle signature (gasless fallback path)
 */
export async function executeGasTrade(
  signer: DZapSigner,
  params: TradeParams,
  approvalMode: TradeApprovalMode,
  quoteOptions?: TradeQuoteOptions
): Promise<DZapTransactionResponse> {
  const requestData = buildTradeRequestData(params);
  const { quote, protocol } = await fetchQuoteAndProtocol(
    params,
    requestData,
    quoteOptions
  );

  if (approvalMode === "permit2") {
    return executeTradeWithPermit2(signer, params, requestData, quote);
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
          amount: quote.srcAmount,
          srcToken: quote.srcToken.address,
          srcDecimals: quote.srcToken.decimals,
          destToken: quote.destToken.address,
          destDecimals: quote.destToken.decimals,
          toChain: params.toChain,
          protocol,
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
 * End-to-end trade — quote, then execute gasless or fall back to gas-backed.
 * Works for same-chain swaps and cross-chain bridges.
 */
export async function executeGaslessTradeWithGasFallback(
  signer: DZapSigner,
  params: TradeParams,
  quoteOptions?: TradeQuoteOptions
): Promise<DZapTransactionResponse> {
  const requestData = buildTradeRequestData(params);

  const [{ quote }, supportsGasless] = await Promise.all([
    fetchQuoteAndProtocol(params, requestData, quoteOptions),
    isGaslessSupportedToken(params.srcToken, params.fromChain),
  ]);

  return supportsGasless
    ? executeGaslessTrade(signer, params, requestData, quote)
    : executeTradeWithPermit2(signer, params, requestData, quote);
}
