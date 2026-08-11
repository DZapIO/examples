import type { HexString } from "@dzapio/sdk";

/**
 * User selection for a borrow bundle: withdraw a lending-protocol collateral
 * position (e.g. an Aave aToken) and borrow another asset against it, in one
 * bundle transaction. Unlike Zap In/Out there's no pool/tick selection —
 * the collateral and borrow asset are both plain tokens.
 */
export type BorrowParams = {
  account: HexString;
  chainId: number;
  /** The collateral position token (e.g. the Aave aToken) to withdraw from. */
  collateralToken: HexString;
  /** Amount of the collateral position to withdraw, in the token's smallest unit. */
  collateralAmount: string;
  /** The asset to borrow, paid out on the same chain as the collateral. */
  borrowToken: HexString;
  slippage: number;
};
