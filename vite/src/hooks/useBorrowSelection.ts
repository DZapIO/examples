import type { HexString } from "@dzapio/sdk";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { DEFAULT_CHAIN } from "../lib/chains";
import type { BorrowParams } from "../types/borrow";

const DEFAULT_SLIPPAGE = 1;

/**
 * Drives the Borrow form: withdraw a collateral position and borrow another
 * asset against it on the same chain. Unlike Zap In/Out this has no
 * pool/token discovery — the caller types the collateral position and the
 * borrow asset directly.
 */
export function useBorrowSelection() {
  const { address: account, isConnected } = useAccount();

  const [chainId, setChainId] = useState<number>(DEFAULT_CHAIN.id);
  const [collateralToken, setCollateralToken] = useState("");
  const [collateralAmount, setCollateralAmount] = useState("");
  const [borrowToken, setBorrowToken] = useState("");

  const borrowParams: BorrowParams | null = useMemo(() => {
    if (!account || !collateralToken || !collateralAmount || !borrowToken) {
      return null;
    }
    try {
      if (BigInt(collateralAmount) <= 0n) return null;
    } catch {
      return null;
    }
    return {
      account: account as HexString,
      chainId,
      collateralToken: collateralToken as HexString,
      collateralAmount,
      borrowToken: borrowToken as HexString,
      slippage: DEFAULT_SLIPPAGE,
    };
  }, [account, chainId, collateralToken, collateralAmount, borrowToken]);

  return {
    isConnected,
    chainId,
    setChainId,
    collateralToken,
    setCollateralToken,
    collateralAmount,
    setCollateralAmount,
    borrowToken,
    setBorrowToken,
    borrowParams,
  };
}
