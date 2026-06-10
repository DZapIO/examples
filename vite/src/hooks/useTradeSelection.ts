import type { HexString, TokenInfo } from "@dzapio/sdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import { DEFAULT_CHAIN, isSupportedChain } from "../lib/chains";
import { fetchChainTokens, fetchUserBalances } from "../lib/token";
import type { TradeParams } from "../types/trade";

export type AmountPreset = "50" | "100" | "custom";

const DEFAULT_SLIPPAGE = 1;

export function useTradeSelection() {
  const { address: account, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [sourceChainId, setSourceChainId] = useState<number>(DEFAULT_CHAIN.id);
  const [destChainId, setDestChainId] = useState<number | null>(null);
  const [srcTokenAddress, setSrcTokenAddress] = useState<string | null>(null);
  const [destTokenAddress, setDestTokenAddress] = useState<string | null>(null);
  const [amountPreset, setAmountPreset] = useState<AmountPreset>("100");
  const [customAmount, setCustomAmount] = useState("");

  const [balanceTokens, setBalanceTokens] = useState<TokenInfo[]>([]);
  const [destTokens, setDestTokens] = useState<TokenInfo[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [loadingDestTokens, setLoadingDestTokens] = useState(false);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    if (chainId && isSupportedChain(chainId)) {
      setSourceChainId(chainId);
    }
  }, [chainId]);

  useEffect(() => {
    if (!account || !isConnected) {
      setBalanceTokens([]);
      setSrcTokenAddress(null);
      return;
    }

    let cancelled = false;
    setLoadingBalances(true);
    setFetchError("");

    fetchUserBalances(sourceChainId, account)
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
        if (!cancelled) {
          setLoadingBalances(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [account, isConnected, sourceChainId]);

  useEffect(() => {
    if (!destChainId) {
      setDestTokens([]);
      setDestTokenAddress(null);
      return;
    }

    let cancelled = false;
    setLoadingDestTokens(true);
    setFetchError("");

    fetchChainTokens(destChainId, account)
      .then((tokens) => {
        if (cancelled) return;
        setDestTokens(tokens);
        setDestTokenAddress((current) =>
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
              : "Failed to load destination tokens"
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDestTokens(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [destChainId, account]);

  const selectedSrcToken = useMemo(
    () => balanceTokens.find((token) => token.contract === srcTokenAddress),
    [balanceTokens, srcTokenAddress]
  );

  const selectedDestToken = useMemo(
    () => destTokens.find((token) => token.contract === destTokenAddress),
    [destTokens, destTokenAddress]
  );

  const computedAmount = useMemo(() => {
    if (!selectedSrcToken) {
      return null;
    }

    const balance = BigInt(selectedSrcToken.balance);

    if (amountPreset === "50") {
      return (balance / 2n).toString();
    }

    if (amountPreset === "100") {
      return balance.toString();
    }

    if (!customAmount.trim()) {
      return null;
    }

    try {
      const parsed = parseUnits(customAmount, selectedSrcToken.decimals);
      if (parsed <= 0n || parsed > balance) {
        return null;
      }
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

      if (parsed <= 0n) {
        return "Amount must be greater than zero";
      }

      if (parsed > balance) {
        return "Amount exceeds balance";
      }
    } catch {
      return "Enter a valid amount";
    }

    return "";
  }, [amountPreset, customAmount, selectedSrcToken]);

  const tradeParams: TradeParams | null = useMemo(() => {
    if (
      !account ||
      !selectedSrcToken ||
      !selectedDestToken ||
      destChainId === null ||
      !computedAmount
    ) {
      return null;
    }

    return {
      fromChain: sourceChainId,
      toChain: destChainId,
      srcToken: selectedSrcToken.contract as HexString,
      destToken: selectedDestToken.contract as HexString,
      srcDecimals: selectedSrcToken.decimals,
      destDecimals: selectedDestToken.decimals,
      amount: computedAmount,
      slippage: DEFAULT_SLIPPAGE,
      account: account as HexString,
    };
  }, [
    account,
    computedAmount,
    destChainId,
    selectedDestToken,
    selectedSrcToken,
    sourceChainId,
  ]);

  const isFormComplete = tradeParams !== null;

  const handleSourceChainChange = useCallback(
    async (nextChainId: number) => {
      setSourceChainId(nextChainId);
      setSrcTokenAddress(null);

      if (chainId !== nextChainId) {
        await switchChainAsync({ chainId: nextChainId });
      }
    },
    [chainId, switchChainAsync]
  );

  const handleDestChainChange = useCallback((nextChainId: number) => {
    setDestChainId(nextChainId);
    setDestTokenAddress(null);
  }, []);

  const formattedBalance = selectedSrcToken
    ? formatUnits(
        BigInt(selectedSrcToken.balance),
        selectedSrcToken.decimals
      )
    : "";

  return {
    isConnected,
    account,
    sourceChainId,
    destChainId,
    balanceTokens,
    destTokens,
    loadingBalances,
    loadingDestTokens,
    fetchError,
    srcTokenAddress,
    destTokenAddress,
    setSrcTokenAddress,
    setDestTokenAddress,
    amountPreset,
    setAmountPreset,
    customAmount,
    setCustomAmount,
    amountError,
    selectedSrcToken,
    selectedDestToken,
    formattedBalance,
    tradeParams,
    isFormComplete,
    handleSourceChainChange,
    handleDestChainChange,
  };
}
