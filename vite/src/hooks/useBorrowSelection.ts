import type { HexString, TokenInfo, ZapPosition } from "@dzapio/sdk";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { DEFAULT_CHAIN } from "../lib/chains";
import { fetchChainTokens } from "../lib/token";
import { fetchZapPositions } from "../lib/zapData";
import type { AmountPreset } from "../types/amount";
import type { BorrowParams } from "../types/borrow";
import { useProtocolsForAction } from "./useProtocolsForAction";

const DEFAULT_SLIPPAGE = 1;

/** Only lending markets that actually expose a borrow action can collateralize one. */
const BORROW_ACTION = "borrow";

/**
 * Drives the Borrow form: pick a lending protocol, pick the collateral position
 * you already hold there, choose how much of it to draw against, and pick the
 * asset to borrow — all on the same chain, since the backend resolves the
 * withdraw-then-borrow path within one chain.
 */
export function useBorrowSelection() {
  const { address: account, isConnected } = useAccount();

  const [chainId, setChainId] = useState<number>(DEFAULT_CHAIN.id);
  const [protocolId, setProtocolId] = useState<string | null>(null);
  const [positionAddress, setPositionAddress] = useState<string | null>(null);
  const [amountPreset, setAmountPreset] = useState<AmountPreset>("100");
  const [customAmount, setCustomAmount] = useState("");
  const [borrowTokenAddress, setBorrowTokenAddress] = useState<string | null>(
    null
  );

  const [positions, setPositions] = useState<ZapPosition[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [borrowTokens, setBorrowTokens] = useState<TokenInfo[]>([]);
  const [loadingBorrowTokens, setLoadingBorrowTokens] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const protocols = useProtocolsForAction(chainId, BORROW_ACTION);

  // The account's collateral positions in the selected lending protocol.
  useEffect(() => {
    if (!account || !isConnected || !protocolId) {
      setPositions([]);
      setPositionAddress(null);
      return;
    }

    let cancelled = false;
    setLoadingPositions(true);
    setFetchError("");

    fetchZapPositions(account as HexString, chainId, protocolId)
      .then((result) => {
        if (cancelled) return;
        setPositions(result);
        setPositionAddress((current) =>
          current && result.some((position) => position.address === current)
            ? current
            : null
        );
      })
      .catch((error) => {
        if (!cancelled) {
          setFetchError(
            error instanceof Error ? error.message : "Failed to load positions"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPositions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [account, isConnected, chainId, protocolId]);

  // Assets available to borrow, paid out on the same chain as the collateral.
  useEffect(() => {
    let cancelled = false;
    setLoadingBorrowTokens(true);
    setFetchError("");

    fetchChainTokens(chainId, account)
      .then((tokens) => {
        if (cancelled) return;
        setBorrowTokens(tokens);
        setBorrowTokenAddress((current) =>
          current && tokens.some((token) => token.contract === current)
            ? current
            : null
        );
      })
      .catch((error) => {
        if (!cancelled) {
          setFetchError(
            error instanceof Error
              ? error.message
              : "Failed to load borrowable assets"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBorrowTokens(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chainId, account]);

  const selectedPosition = useMemo(
    () => positions.find((position) => position.address === positionAddress),
    [positions, positionAddress]
  );

  const selectedProtocol = useMemo(
    () => protocols.protocols.find((protocol) => protocol.id === protocolId),
    [protocols.protocols, protocolId]
  );

  const selectedBorrowToken = useMemo(
    () => borrowTokens.find((token) => token.contract === borrowTokenAddress),
    [borrowTokens, borrowTokenAddress]
  );

  // How much of the collateral position to withdraw, in its smallest unit.
  const computedAmount = useMemo(() => {
    if (!selectedPosition?.amount) return null;
    const held = BigInt(selectedPosition.amount);

    if (amountPreset === "50") return (held / 2n).toString();
    if (amountPreset === "100") return held.toString();
    if (!customAmount.trim()) return null;

    try {
      const parsed = parseUnits(customAmount, selectedPosition.decimals);
      if (parsed <= 0n || parsed > held) return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }, [selectedPosition, amountPreset, customAmount]);

  const amountError = useMemo(() => {
    if (amountPreset !== "custom" || !selectedPosition || !customAmount.trim()) {
      return "";
    }
    try {
      const parsed = parseUnits(customAmount, selectedPosition.decimals);
      const held = BigInt(selectedPosition.amount ?? "0");
      if (parsed <= 0n) return "Amount must be greater than zero";
      if (parsed > held) return "Amount exceeds your position";
    } catch {
      return "Enter a valid amount";
    }
    return "";
  }, [amountPreset, customAmount, selectedPosition]);

  const formattedPositionBalance = selectedPosition?.amount
    ? formatUnits(BigInt(selectedPosition.amount), selectedPosition.decimals)
    : "";

  const borrowParams: BorrowParams | null = useMemo(() => {
    if (!account || !selectedPosition || !selectedBorrowToken || !computedAmount) {
      return null;
    }
    return {
      account: account as HexString,
      chainId,
      collateralToken: selectedPosition.address as HexString,
      collateralAmount: computedAmount,
      borrowToken: selectedBorrowToken.contract as HexString,
      slippage: DEFAULT_SLIPPAGE,
    };
  }, [account, chainId, selectedPosition, selectedBorrowToken, computedAmount]);

  return {
    isConnected,
    chainId,
    setChainId,
    protocols,
    protocolId,
    setProtocolId,
    selectedProtocol,
    positions,
    loadingPositions,
    positionAddress,
    setPositionAddress,
    selectedPosition,
    amountPreset,
    setAmountPreset,
    customAmount,
    setCustomAmount,
    amountError,
    formattedPositionBalance,
    borrowTokens,
    loadingBorrowTokens,
    borrowTokenAddress,
    setBorrowTokenAddress,
    selectedBorrowToken,
    fetchError,
    borrowParams,
  };
}
