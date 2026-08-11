import {
  ApprovalModes,
  Services,
  TxnStatus,
  type HexString,
  type ZapBundleRequest,
  type ZapPathAction,
  type ZapPreExecutionStepData,
  type ZapQuoteResponse,
} from "@dzapio/sdk";
import type { DZapSigner } from "../types/zap";
import type { BorrowParams } from "../types/borrow";
import { dZap } from "./client";

/**
 * Step 1 — Build the bundle request for a borrow. A single `borrow` action is
 * enough: `srcToken` is the collateral position, `destToken` is the asset to
 * borrow. The backend resolves this into a withdraw-then-borrow path
 * internally, so the caller never constructs those steps itself.
 */
export function buildBorrowBundleRequest(
  params: BorrowParams
): ZapBundleRequest {
  return {
    account: params.account,
    recipient: params.account,
    refundee: params.account,
    slippage: params.slippage,
    actions: [
      {
        action: "borrow" as ZapPathAction,
        srcToken: {
          address: params.collateralToken,
          amount: params.collateralAmount,
        },
        srcChainId: params.chainId,
        destToken: params.borrowToken,
        destChainId: params.chainId,
      },
    ],
  };
}

/** A built bundle request paired with its quote, ready to show and then execute. */
export type BorrowQuoteWithRequest = {
  request: ZapBundleRequest;
  quote: ZapQuoteResponse;
};

/**
 * Quote step — build the bundle request and fetch a quote (read-only).
 * A borrow quote may come back with `preExecutionSteps`: a typed-data
 * signature (e.g. Aave's `DelegationWithSig`) the user must sign before the
 * route can be built. Nothing to do with them yet — just show the quote.
 */
export async function fetchBorrowQuote(
  params: BorrowParams
): Promise<BorrowQuoteWithRequest> {
  const request = buildBorrowBundleRequest(params);
  const quote = await dZap.getZapBundleQuote(request);
  return { request, quote };
}

/**
 * Step 2a — Ensure the collateral position has a Permit2 allowance,
 * approving once on-chain if needed. Bundle actions (like zaps) go through
 * Permit2 exclusively, not EIP-2612.
 */
async function approveCollateralToken(
  signer: DZapSigner,
  params: BorrowParams
): Promise<void> {
  const tokens = [
    { address: params.collateralToken, amount: params.collateralAmount },
  ];

  const { data } = await dZap.getAllowance({
    chainId: params.chainId,
    sender: params.account,
    service: Services.zap,
    tokens,
    mode: ApprovalModes.PermitSingle,
  });

  const tokenApproval = data[params.collateralToken];
  if (!tokenApproval) {
    throw new Error(`No allowance data for token: ${params.collateralToken}`);
  }
  if (tokenApproval.allowance >= BigInt(params.collateralAmount)) {
    return;
  }

  const result = await dZap.approve({
    chainId: params.chainId,
    service: Services.zap,
    signer,
    tokens,
    mode: ApprovalModes.PermitSingle,
  });

  // Abort the borrow if the approval did not go through (e.g. user rejected).
  if (result.status !== TxnStatus.success) {
    throw new Error(`Permit2 approval failed (code ${result.code})`);
  }
}

/**
 * Step 2b — Sign a Permit2 `PermitSingle` for the collateral position and
 * return the encoded permit, to attach to the bundle's `borrow` action.
 */
async function signCollateralTokenPermit(
  signer: DZapSigner,
  params: BorrowParams,
  quote: ZapQuoteResponse
): Promise<HexString | undefined> {
  const response = await dZap.sign({
    chainId: params.chainId,
    sender: params.account,
    service: Services.zap,
    signer,
    tokens: [
      { address: params.collateralToken, amount: params.collateralAmount },
    ],
    spender: quote.approvalData?.[0].approveTo,
  });

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
 * Step 3 — Sign any pre-execution steps the quote came back with, and return
 * the data to attach to the build request. Returns `undefined` when there's
 * nothing to sign (most bundle actions never produce any).
 */
async function resolvePreExecutionStepsData(
  signer: DZapSigner,
  account: string,
  quote: ZapQuoteResponse
): Promise<ZapPreExecutionStepData[] | undefined> {
  if (!quote.preExecutionSteps?.length) {
    return undefined;
  }
  return dZap.handlePreExecutionSteps({
    preExecutionSteps: quote.preExecutionSteps,
    signer,
    account,
  });
}

/**
 * Step 4 — Authorize the collateral (Permit2) and resolve any pre-execution
 * signatures → build the bundle transaction → execute its steps on-chain.
 * Building without a required Permit2 permit, or without a required
 * pre-execution signature, fails on the backend, so both are always
 * resolved first.
 */
export async function executeBorrow(
  signer: DZapSigner,
  params: BorrowParams,
  prepared: BorrowQuoteWithRequest
) {
  await approveCollateralToken(signer, params);
  const permitData = await signCollateralTokenPermit(
    signer,
    params,
    prepared.quote
  );

  const preExecutionStepsData = await resolvePreExecutionStepsData(
    signer,
    prepared.request.account,
    prepared.quote
  );

  const [borrowAction, ...restActions] = prepared.request.actions;
  const fullRequest: ZapBundleRequest = {
    ...prepared.request,
    actions: [{ ...borrowAction, permitData }, ...restActions],
    ...(preExecutionStepsData && { preExecutionStepsData }),
  };
  const route = await dZap.buildZapBundleTx(fullRequest);

  return dZap.zap({ request: fullRequest, steps: route.steps, signer });
}

/** User-facing message from an SDK borrow execution result. */
export function formatBorrowResult(
  result: Awaited<ReturnType<typeof executeBorrow>>
): string {
  if (
    result.status === TxnStatus.success &&
    "txnHash" in result &&
    result.txnHash
  ) {
    return `Transaction successful: ${result.txnHash}`;
  }
  const error = "error" in result ? result.error : undefined;
  return `Transaction failed: ${error ?? "unknown error"}`;
}
