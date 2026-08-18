import type { HexString } from "@dzapio/sdk";

/**
 * User selection for a limit order: sell `makingAmount` of `makerToken` for
 * `takerToken` at `limitPrice`, on a single chain. Unlike a swap this never
 * executes on-chain from our side — the user signs the order and the backend
 * relays it to the provider's orderbook, where it rests until a taker fills it.
 */
export type LimitOrderParams = {
  account: HexString;
  chainId: number;
  /** Limit-order venue that will custody the order (e.g. "oneinch"). */
  providerId: string;
  /** Token being sold. */
  makerToken: HexString;
  /** Amount of `makerToken` to sell, in its smallest unit. */
  makingAmount: string;
  /** Token being bought — must be on the same chain as `makerToken`. */
  takerToken: HexString;
  /** How many `takerToken` per one `makerToken`, as a decimal string. */
  limitPrice: string;
  /** Unix seconds after which the order can no longer be filled. */
  expiry?: number;
  slippage: number;
};

/** EIP-712 payload the wallet is asked to sign for an order. */
export type LimitOrderTypedData = {
  domain: Record<string, unknown>;
  types: Record<string, { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
};

/** buildTx step asking the user to sign the order. */
export type LimitOrderSignStep = {
  action: "sign";
  data: {
    type: string;
    txnId: HexString;
    kind: string;
    providerId: string;
    typedData: LimitOrderTypedData;
  };
};

/**
 * buildTx step asking the client to hand the signed order back to the backend,
 * which relays it to the provider — hence "executed by the backend" rather
 * than sent from the wallet like an `execute` step.
 */
export type LimitOrderBroadcastStep = {
  action: "broadcast";
  data: {
    type: string;
    txnId: HexString;
    chainId: number;
    providerId: string;
    /** Everything the provider needs except `signature`, merged in after signing. */
    payload: Record<string, unknown>;
  };
};

/**
 * buildTx step asking for an on-chain ERC20 approval. Only appears for tokens
 * that can't do EIP-2612 — permit-capable ones authorize by signature instead.
 */
export type LimitOrderApproveStep = {
  action: "approve";
  data: {
    type: string;
    txnId: HexString;
    callTo: HexString;
    callData: HexString;
    value: string;
    estimatedGas: string;
  };
};

export type LimitOrderStep =
  | LimitOrderApproveStep
  | LimitOrderSignStep
  | LimitOrderBroadcastStep;

/** buildTx response for a limit order: steps only, no zap transaction. */
export type LimitOrderRoute = {
  steps: LimitOrderStep[];
};

/**
 * A signature the quote needs *before* the order can be built — for 1inch, the
 * EIP-2612 permit that lets the protocol pull the maker's tokens at fill time.
 *
 * It can't be an ordinary step: the permit is embedded in the order's extension,
 * which determines the salt and therefore the order hash. So it has to be signed
 * before the order exists, hence the extra quote → sign → buildTx round trip.
 */
export type LimitOrderPreExecutionStep = {
  id: string;
  type: "sign";
  data: LimitOrderTypedData;
};

/** The signed response to a pre-execution step, echoed back on buildTx. */
export type LimitOrderPreExecutionStepData = {
  id: string;
  type: "sign";
  signature: HexString;
  /** Echoed verbatim — the backend reads the signed values from here rather than
   *  regenerating them, since any change would invalidate the signature. */
  message: Record<string, unknown>;
};

/** Result of relaying a signed order to the provider. */
export type LimitOrderSubmitResult = {
  orderHash: string;
  status: string;
};
