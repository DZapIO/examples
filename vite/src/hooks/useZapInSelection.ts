import type { HexString, TokenInfo, ZapPool } from "@dzapio/sdk";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { DEFAULT_CHAIN } from "../lib/chains";
import { fetchUserBalances } from "../lib/token";
import { fetchZapPools } from "../lib/zapData";
import type { AmountPreset } from "../types/amount";
import type { ZapInParams } from "../types/zap";
import { useZapProtocols } from "./useZapProtocols";

export type { AmountPreset };

const DEFAULT_SLIPPAGE = 1;

/**
 * Drives the Zap In form: a source token (from balances) on one chain into a
 * destination pool chosen by protocol on another (or the same) chain.
 */
export function useZapInSelection() {
  const { address: account, isConnected } = useAccount();

  const [srcChainId, setSrcChainId] = useState<number>(DEFAULT_CHAIN.id);
  const [srcTokenAddress, setSrcTokenAddress] = useState<string | null>(null);
  const [amountPreset, setAmountPreset] = useState<AmountPreset>("100");
  const [customAmount, setCustomAmount] = useState("");

  const [destChainId, setDestChainId] = useState<number>(DEFAULT_CHAIN.id);
  const [protocolId, setProtocolId] = useState<string | null>(null);
  const [poolAddress, setPoolAddress] = useState<string | null>(null);

  const [balanceTokens, setBalanceTokens] = useState<TokenInfo[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [pools, setPools] = useState<ZapPool[]>([]);
  const [loadingPools, setLoadingPools] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const protocols = useZapProtocols(destChainId);

  // Source token balances for the connected account on the source chain.
  useEffect(() => {
    if (!account || !isConnected) {
      setBalanceTokens([]);
      setSrcTokenAddress(null);
      return;
    }

    let cancelled = false;
    setLoadingBalances(true);
    setFetchError("");

    fetchUserBalances(srcChainId, account)
      .then((tokens) => {
        if (cancelled) return;
        setBalanceTokens(tokens);
        setSrcTokenAddress((current) =>
          current && tokens.some((token) => token.contract === current)
            ? current
            : null
        );
      })
      .catch((error) => {
        if (!cancelled) {
          setFetchError(
            error instanceof Error ? error.message : "Failed to load balances"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBalances(false);
      });

    return () => {
      cancelled = true;
    };
  }, [account, isConnected, srcChainId]);

  // Pools for the selected protocol on the destination chain.
  useEffect(() => {
    if (!protocolId) {
      setPools([]);
      setPoolAddress(null);
      return;
    }

    let cancelled = false;
    setLoadingPools(true);
    setFetchError("");

    fetchZapPools(destChainId, protocolId)
      .then((result) => {
        if (cancelled) return;
        setPools(result);
        setPoolAddress((current) =>
          current && result.some((pool) => pool.address === current)
            ? current
            : null
        );
      })
      .catch((error) => {
        if (!cancelled) {
          setFetchError(
            error instanceof Error ? error.message : "Failed to load pools"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPools(false);
      });

    return () => {
      cancelled = true;
    };
  }, [destChainId, protocolId]);

  const selectedSrcToken = useMemo(
    () => balanceTokens.find((token) => token.contract === srcTokenAddress),
    [balanceTokens, srcTokenAddress]
  );

  const selectedPool = useMemo(
    () => pools.find((pool) => pool.address === poolAddress),
    [pools, poolAddress]
  );

  const selectedProtocol = useMemo(
    () => protocols.protocols.find((protocol) => protocol.id === protocolId),
    [protocols.protocols, protocolId]
  );

  const computedAmount = useMemo(() => {
    if (!selectedSrcToken) return null;
    const balance = BigInt(selectedSrcToken.balance);

    if (amountPreset === "50") return (balance / 2n).toString();
    if (amountPreset === "100") return balance.toString();
    if (!customAmount.trim()) return null;

    try {
      const parsed = parseUnits(customAmount, selectedSrcToken.decimals);
      if (parsed <= 0n || parsed > balance) return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }, [selectedSrcToken, amountPreset, customAmount]);

  const amountError = useMemo(() => {
    if (amountPreset !== "custom" || !selectedSrcToken || !customAmount.trim()) {
      return "";
    }
    try {
      const parsed = parseUnits(customAmount, selectedSrcToken.decimals);
      const balance = BigInt(selectedSrcToken.balance);
      if (parsed <= 0n) return "Amount must be greater than zero";
      if (parsed > balance) return "Amount exceeds balance";
    } catch {
      return "Enter a valid amount";
    }
    return "";
  }, [amountPreset, customAmount, selectedSrcToken]);

  const zapInParams: ZapInParams | null = useMemo(() => {
    if (!account || !selectedSrcToken || !selectedPool || !computedAmount) {
      return null;
    }
    return {
      account: account as HexString,
      srcChainId,
      srcToken: selectedSrcToken.contract as HexString,
      amount: computedAmount,
      destChainId,
      pool: selectedPool,
      slippage: DEFAULT_SLIPPAGE,
    };
  }, [account, selectedSrcToken, selectedPool, computedAmount, srcChainId, destChainId]);

  const formattedBalance = selectedSrcToken
    ? formatUnits(BigInt(selectedSrcToken.balance), selectedSrcToken.decimals)
    : "";

  return {
    isConnected,
    srcChainId,
    setSrcChainId,
    balanceTokens,
    loadingBalances,
    srcTokenAddress,
    setSrcTokenAddress,
    selectedSrcToken,
    amountPreset,
    setAmountPreset,
    customAmount,
    setCustomAmount,
    amountError,
    formattedBalance,
    destChainId,
    setDestChainId,
    protocols,
    protocolId,
    setProtocolId,
    selectedProtocol,
    pools,
    loadingPools,
    poolAddress,
    setPoolAddress,
    selectedPool,
    fetchError,
    zapInParams,
  };
}
