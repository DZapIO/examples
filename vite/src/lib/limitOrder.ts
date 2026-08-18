import type { HexString, ZapBundleRequest, ZapQuoteResponse } from "@dzapio/sdk";
import type { PublicClient, WalletClient } from "viem";
import type {
  LimitOrderApproveStep,
  LimitOrderBroadcastStep,
  LimitOrderParams,
  LimitOrderPreExecutionStep,
  LimitOrderPreExecutionStepData,
  LimitOrderRoute,
  LimitOrderSignStep,
  LimitOrderStep,
  LimitOrderSubmitResult,
  LimitOrderTypedData,
} from "../types/limitOrder";
import { postJson } from "./api";

/**
 * Step 1 — Build the bundle request for a limit order. A single `limitOrder`
 * action: `srcToken` is what you sell, `destToken` what you want, and the
 * price/expiry ride along in `positionDetails` alongside the venue that will
 * hold the order.
 *
 * Cast at the boundary because this SDK build predates limit orders — neither
 * the action name nor the limit-order `positionDetails` exist in its types.
 */
export function buildLimitOrderBundleRequest(
  params: LimitOrderParams
): ZapBundleRequest {
  return {
    account: params.account,
    recipient: params.account,
    refundee: params.account,
    slippage: params.slippage,
    actions: [
      {
        action: "limitOrder",
        srcToken: {
          address: params.makerToken,
          amount: params.makingAmount,
        },
        srcChainId: params.chainId,
        destToken: params.takerToken,
        destChainId: params.chainId,
        positionDetails: {
          provider: params.providerId,
          limitPrice: params.limitPrice,
          ...(params.expiry ? { expiry: params.expiry } : {}),
        },
      },
    ],
  } as unknown as ZapBundleRequest;
}

/** A built bundle request paired with its quote, ready to show and then execute. */
export type LimitOrderQuoteWithRequest = {
  request: ZapBundleRequest;
  quote: ZapQuoteResponse;
};

/**
 * Quote step — price the order without committing to it. The response carries
 * the taker amount implied by the limit price, so the form can show what the
 * order would yield if filled.
 */
export async function fetchLimitOrderQuote(
  params: LimitOrderParams
): Promise<LimitOrderQuoteWithRequest> {
  const request = buildLimitOrderBundleRequest(params);
  const quote = await postJson<ZapQuoteResponse>("/bundle/quote", request);
  return { request, quote };
}

const isApproveStep = (step: LimitOrderStep): step is LimitOrderApproveStep =>
  step.action === "approve";

const isSignStep = (step: LimitOrderStep): step is LimitOrderSignStep =>
  step.action === "sign";

const isBroadcastStep = (
  step: LimitOrderStep
): step is LimitOrderBroadcastStep => step.action === "broadcast";

/** Signs an EIP-712 payload with the connected wallet. */
const signTypedData = (
  walletClient: WalletClient,
  account: HexString,
  typedData: LimitOrderTypedData
): Promise<HexString> =>
  walletClient.signTypedData({
    account,
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
    // Our step types are deliberately loose (the payload is provider-defined),
    // so they don't line up with viem's generic EIP-712 signatures.
  } as never);

/**
 * Step 2 — Satisfy the quote's pre-execution steps.
 *
 * For a permit-capable token (USDC and friends) the quote asks for an EIP-2612
 * signature first, which authorizes the protocol to pull the maker's tokens at
 * fill time without an approval transaction. This is exactly what 1inch's own UI
 * collects, and it has to happen before buildTx because the permit is embedded
 * in the order.
 */
async function resolvePreExecutionSteps(
  walletClient: WalletClient,
  params: LimitOrderParams,
  steps: LimitOrderPreExecutionStep[] | undefined,
  onStatus?: (message: string) => void
): Promise<LimitOrderPreExecutionStepData[] | undefined> {
  if (!steps?.length) return undefined;

  const signed: LimitOrderPreExecutionStepData[] = [];

  for (const step of steps) {
    onStatus?.("Approve the token permit in your wallet…");
    const signature = await signTypedData(walletClient, params.account, step.data);
    // The message is echoed back untouched: the backend packs the signed values
    // into the order, and regenerating any of them would void the signature.
    signed.push({
      id: step.id,
      type: "sign",
      signature,
      message: step.data.message,
    });
  }

  return signed;
}

/**
 * Step 3 — Build, authorize, sign, submit.
 *
 * A limit order produces no zap transaction. buildTx returns an optional
 * `approve` step (only for tokens that can't do EIP-2612), then a `sign` step
 * carrying the order, then a `broadcast` step. We sign the order and hand the
 * signature back to /broadcast, which relays it to the provider's orderbook.
 *
 * The SDK can't drive this — its step vocabulary is `execute` only — so the
 * wallet client is used directly.
 */
export async function executeLimitOrder(
  walletClient: WalletClient,
  params: LimitOrderParams,
  prepared: LimitOrderQuoteWithRequest,
  options?: { publicClient?: PublicClient; onStatus?: (message: string) => void }
): Promise<LimitOrderSubmitResult> {
  const { publicClient, onStatus } = options ?? {};

  const preExecutionStepsData = await resolvePreExecutionSteps(
    walletClient,
    params,
    prepared.quote.preExecutionSteps as LimitOrderPreExecutionStep[] | undefined,
    onStatus
  );

  onStatus?.("Building the order…");
  const route = await postJson<LimitOrderRoute>("/bundle/buildTx", {
    ...prepared.request,
    ...(preExecutionStepsData && { preExecutionStepsData }),
  });

  const approveStep = route.steps.find(isApproveStep);
  const signStep = route.steps.find(isSignStep);
  const broadcastStep = route.steps.find(isBroadcastStep);

  if (!signStep || !broadcastStep) {
    throw new Error("Limit order route did not return sign and broadcast steps");
  }

  // Present only when the token has no permit support. The order would submit
  // fine without it, but could never be filled — so it's done up front.
  if (approveStep) {
    onStatus?.("Confirm the token approval in your wallet…");
    const hash = await walletClient.sendTransaction({
      account: params.account,
      chain: walletClient.chain,
      to: approveStep.data.callTo,
      data: approveStep.data.callData,
      value: BigInt(approveStep.data.value || "0"),
    });
    onStatus?.("Waiting for the approval to confirm…");
    await publicClient?.waitForTransactionReceipt({ hash });
  }

  onStatus?.("Sign the order in your wallet…");
  const signature = await signTypedData(
    walletClient,
    params.account,
    signStep.data.typedData
  );

  onStatus?.("Submitting the order…");
  return postJson<LimitOrderSubmitResult>("/broadcast", {
    txId: broadcastStep.data.txnId,
    chainId: broadcastStep.data.chainId,
    providerId: broadcastStep.data.providerId,
    txData: { payload: { ...broadcastStep.data.payload, signature } },
  });
}

/** User-facing message for a submitted limit order. */
export function formatLimitOrderResult(result: LimitOrderSubmitResult): string {
  return `Order ${result.status?.toLowerCase() ?? "submitted"} — resting in the orderbook until filled. Hash: ${result.orderHash}`;
}
