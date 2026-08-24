import type { HexString } from "@dzapio/sdk";

/**
 * User selection for a limit order: sell `makingAmount` of `makerToken` for
 * `takerToken` at `limitPrice`, on a single chain. Unlike a swap this never
 * executes on-chain from our side — the user signs the order and the backend
 * relays it to the provider's orderbook, where it rests until a taker fills it.
 *
 * The step and route shapes a limit order returns (`sign`, `broadcast`, and the
 * quote's `preExecutionSteps`) come from the SDK — see `ZapTransactionStep` and
 * `ZapPreExecutionStep` — so they aren't redeclared here.
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
