import type {
  HexString,
  ProviderDetails,
  ZapBuildTxnRequest,
  ZapPool,
  ZapPosition,
} from "@dzapio/sdk";

/** A zap protocol (e.g. Uniswap, Aerodrome) available on a chain. */
export type ZapProtocol = ProviderDetails;

/** Re-export the SDK signer type so zap code doesn't depend on trade types. */
export type { DZapSigner } from "./trade";

/**
 * A zap build/execute request with `permitData` stripped — the Permit2
 * signature is attached by the txn layer right before building the route.
 */
export type ZapExecutionRequest = Omit<ZapBuildTxnRequest, "permitData">;

/** User selection for a Zap In: a source token → a destination pool. */
export type ZapInParams = {
  account: HexString;
  srcChainId: number;
  srcToken: HexString;
  amount: string;
  destChainId: number;
  pool: ZapPool;
  slippage: number;
};

/** User selection for a Zap Out: a protocol position → any chain's token. */
export type ZapOutParams = {
  account: HexString;
  position: ZapPosition;
  amount: string;
  destChainId: number;
  destToken: HexString;
  slippage: number;
};
