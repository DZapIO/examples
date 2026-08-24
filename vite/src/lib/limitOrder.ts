import {
  TxnStatus,
  type ZapBundleRequest,
  type ZapPathAction,
  type ZapQuoteResponse,
} from "@dzapio/sdk";
import type { LimitOrderParams } from "../types/limitOrder";
import type { DZapSigner } from "../types/zap";
import { dZap } from "./client";

export function buildLimitOrderBundleRequest(
  params: LimitOrderParams,
): ZapBundleRequest {
  return {
    account: params.account,
    recipient: params.account,
    refundee: params.account,
    slippage: params.slippage,
    actions: [
      {
        action: "limitOrder" as ZapPathAction,
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
  };
}

export type LimitOrderQuoteWithRequest = {
  request: ZapBundleRequest;
  quote: ZapQuoteResponse;
};


export async function fetchLimitOrderQuote(
  params: LimitOrderParams,
): Promise<LimitOrderQuoteWithRequest> {
  const request = buildLimitOrderBundleRequest(params);
  const quote = await dZap.getZapBundleQuote(request);
  return { request, quote };
}

export async function executeLimitOrder(
  signer: DZapSigner,
  prepared: LimitOrderQuoteWithRequest,
) {
  return dZap.zap({
    request: prepared.request,
    preExecutionSteps: prepared.quote.preExecutionSteps,
    signer,
  });
}

export function formatLimitOrderResult(
  result: Awaited<ReturnType<typeof executeLimitOrder>>,
): string {
  if (result.status === TxnStatus.success) {
    // Off-chain orders come back with the provider's identifier as `txnHash` — for 1inch, the order hash.
    const orderHash = "txnHash" in result ? result.txnHash : undefined;
    return `Order submitted — resting in the orderbook until filled.${
      orderHash ? ` Hash: ${orderHash}` : ""
    }`;
  }
  const error = "errorMsg" in result ? result.errorMsg : undefined;
  return `Order failed: ${error ?? "unknown error"}`;
}
