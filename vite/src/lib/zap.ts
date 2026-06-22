import {
  ApprovalModes,
  HexString,
  PermitTypes,
  Services,
  TxnStatus,
  ZapQuoteResponse,
  ZapRouteRequestPoolDetails,
} from "@dzapio/sdk";
import { zeroAddress } from "viem";
import type {
  DZapSigner,
  ZapExecutionRequest,
  ZapInParams,
  ZapOutParams,
} from "../types/zap";
import { dZap } from "./client";
import { derivePoolTickRange } from "./zapData";

/**
 * Step 1a — Build the route request for a Zap In (token → pool).
 * The pool is the destination token; `poolDetails` carries the tick range for
 * concentrated-liquidity pools.
 */
export function buildZapInRequest(
  params: ZapInParams,
  poolDetails?: ZapRouteRequestPoolDetails
): ZapExecutionRequest {
  return {
    srcChainId: params.srcChainId,
    srcToken: params.srcToken,
    amount: params.amount,
    destChainId: params.destChainId,
    destToken: params.pool.address,
    account: params.account,
    recipient: params.account,
    refundee: params.account,
    slippage: params.slippage,
    ...(poolDetails && { poolDetails }),
  };
}

/**
 * Step 1b — Build the route request for a Zap Out (position → token).
 * The position is the source token; NFT positions are identified by `nftId`.
 */
export function buildZapOutRequest(params: ZapOutParams): ZapExecutionRequest {
  const { position } = params;
  return {
    srcChainId: position.chainId,
    srcToken: position.address,
    amount: params.amount,
    destChainId: params.destChainId,
    destToken: params.destToken,
    account: params.account,
    recipient: params.account,
    refundee: params.account,
    slippage: params.slippage,
    ...(position.nftDetails && {
      positionDetails: { nftId: position.nftDetails.id },
    }),
  };
}

/** True when the source token needs no token approval (native asset). */
function isNativeSource(request: ZapExecutionRequest): boolean {
  return !request.amount || request.srcToken === zeroAddress;
}

/**
 * Step 2 — Ensure the source token has a Permit2 allowance, approving once if
 * needed. Zaps use Permit2 exclusively (no EIP-2612). Native sources skip this.
 */
async function approveSourceTokenForPermit2(
  signer: DZapSigner,
  request: ZapExecutionRequest
): Promise<void> {
  if (isNativeSource(request)) {
    return;
  }

  const tokens = [
    { address: request.srcToken as HexString, amount: request.amount! },
  ];

  const { data } = await dZap.getAllowance({
    chainId: request.srcChainId,
    sender: request.account as HexString,
    service: Services.zap,
    tokens,
    mode: ApprovalModes.PermitSingle,
  });

  const tokenApproval = data[request.srcToken];
  if (!tokenApproval) {
    throw new Error(`No allowance data for token: ${request.srcToken}`);
  }
  if (tokenApproval.allowance >= BigInt(request.amount!)) {
    return;
  }

  const result = await dZap.approve({
    chainId: request.srcChainId,
    service: Services.zap,
    signer,
    tokens,
    mode: ApprovalModes.PermitSingle,
  });

  // Abort the zap if the approval did not go through (e.g. user rejected).
  if (result.status !== TxnStatus.success) {
    throw new Error(`Permit2 approval failed (code ${result.code})`);
  }
}

/**
 * Step 3 — Sign a Permit2 `PermitSingle` for the source token and return the
 * encoded permit. Native sources return `undefined` (nothing to permit).
 */
async function signSourceTokenPermit2(
  signer: DZapSigner,
  request: ZapExecutionRequest
): Promise<HexString | undefined> {
  if (isNativeSource(request)) {
    return undefined;
  }

  const response = await dZap.sign({
    chainId: request.srcChainId,
    sender: request.account as HexString,
    service: Services.zap,
    signer,
    tokens: [
      { address: request.srcToken as HexString, amount: request.amount! },
    ],
    permitType: PermitTypes.PermitSingle,
  });

  // Surface a signature failure here so the zap stops before building a txn
  // that would otherwise fail with a confusing downstream error.
  if (response.status !== TxnStatus.success || !("tokens" in response)) {
    throw new Error(`Permit2 signature failed (code ${response.code})`);
  }

  const permitData = response.tokens[0]?.permitData;
  if (!permitData) {
    throw new Error("Permit2 signature returned no permit data");
  }
  return permitData;
}

/**
 * Step 4 — Authorize (Permit2) → build the route → execute its steps on-chain.
 * Shared by Zap In and Zap Out: only the request differs.
 */
export async function executeZap(
  signer: DZapSigner,
  request: ZapExecutionRequest
) {
  await approveSourceTokenForPermit2(signer, request);
  const permitData = await signSourceTokenPermit2(signer, request);

  const fullRequest = { ...request, permitData };
  const route = await dZap.buildZapTxn(fullRequest);

  return dZap.zap({ request: fullRequest, steps: route.steps, signer });
}

/** A built request paired with its quote, ready to show and then execute. */
export type PreparedZap = {
  request: ZapExecutionRequest;
  quote: ZapQuoteResponse;
};

/**
 * Zap In quote step — derive the pool tick range, build the request, and fetch
 * a quote. Read-only: no approvals or signatures. Run this before confirming.
 */
export async function prepareZapIn(params: ZapInParams): Promise<PreparedZap> {
  const poolDetails = await derivePoolTickRange(params.pool);
  const request = buildZapInRequest(params, poolDetails);
  const quote = await dZap.getZapQuote(request);
  return { request, quote };
}

/** Zap Out quote step — build the request and fetch a quote (read-only). */
export async function prepareZapOut(params: ZapOutParams): Promise<PreparedZap> {
  const request = buildZapOutRequest(params);
  const quote = await dZap.getZapQuote(request);
  return { request, quote };
}

/** User-facing message from an SDK zap response. */
export function formatZapResult(
  result: Awaited<ReturnType<typeof executeZap>>
): string {
  if (result.status === TxnStatus.success && "txnHash" in result && result.txnHash) {
    return `Transaction successful: ${result.txnHash}`;
  }
  const error = "error" in result ? result.error : undefined;
  return `Transaction failed: ${error ?? "unknown error"}`;
}
