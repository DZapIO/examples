import type { HexString, TokenInfo } from "@dzapio/sdk";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { DEFAULT_CHAIN } from "../lib/chains";
import { fetchChainTokens, fetchUserBalances } from "../lib/token";
import type { AmountPreset } from "../types/amount";
import type { LimitOrderParams } from "../types/limitOrder";
import { useProtocolsForAction } from "./useProtocolsForAction";

const DEFAULT_SLIPPAGE = 1;

const LIMIT_ORDER_ACTION = "limitOrder";

/** Expiry choices offered in the form, in minutes. */
export const EXPIRY_OPTIONS = [
  { label: "10 minutes", minutes: 10 },
  { label: "1 hour", minutes: 60 },
  { label: "1 day", minutes: 60 * 24 },
  { label: "1 week", minutes: 60 * 24 * 7 },
] as const;

/**
 * Drives the Limit Order form: sell one token for another at a price you set,
 * on a single chain. Both legs must share a chain — the order is one signed
 * intent against one venue, so there's nothing to bridge.
 */
export function useLimitOrderSelection() {
  const { address: account, isConnected } = useAccount();

  const [chainId, setChainId] = useState<number>(DEFAULT_CHAIN.id);
  const [protocolId, setProtocolId] = useState<string | null>(null);

  const [makerTokenAddress, setMakerTokenAddress] = useState<string | null>(
    null
  );
  const [amountPreset, setAmountPreset] = useState<AmountPreset>("100");
  const [customAmount, setCustomAmount] = useState("");

  const [takerTokenAddress, setTakerTokenAddress] = useState<string | null>(
    null
  );
  const [limitPrice, setLimitPrice] = useState("");
  const [expiryMinutes, setExpiryMinutes] = useState<number>(
    EXPIRY_OPTIONS[1].minutes
  );

  const [makerTokens, setMakerTokens] = useState<TokenInfo[]>([]);
  const [loadingMakerTokens, setLoadingMakerTokens] = useState(false);
  const [takerTokens, setTakerTokens] = useState<TokenInfo[]>([]);
  const [loadingTakerTokens, setLoadingTakerTokens] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const protocols = useProtocolsForAction(chainId, LIMIT_ORDER_ACTION);

  // Default to the only venue when there's just one, so the form is usable
  // without an extra click.
  useEffect(() => {
    if (protocolId || protocols.protocols.length === 0) return;
    setProtocolId(protocols.protocols[0].id);
  }, [protocols.protocols, protocolId]);

  // You can only sell what you hold, so the maker side comes from balances.
  useEffect(() => {
    if (!account || !isConnected) {
      setMakerTokens([]);
      setMakerTokenAddress(null);
      return;
    }

    let cancelled = false;
    setLoadingMakerTokens(true);
    setFetchError("");

    fetchUserBalances(chainId, account)
      .then((tokens) => {
        if (cancelled) return;
        setMakerTokens(tokens);
        setMakerTokenAddress((current) =>
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
        if (!cancelled) setLoadingMakerTokens(false);
      });

    return () => {
      cancelled = true;
    };
  }, [account, isConnected, chainId]);

  // The taker side can be any token on the chain, held or not.
  useEffect(() => {
    let cancelled = false;
    setLoadingTakerTokens(true);
    setFetchError("");

    fetchChainTokens(chainId, account)
      .then((tokens) => {
        if (cancelled) return;
        setTakerTokens(tokens);
        setTakerTokenAddress((current) =>
          current && tokens.some((token) => token.contract === current)
            ? current
            : null
        );
      })
      .catch((error) => {
        if (!cancelled) {
          setFetchError(
            error instanceof Error ? error.message : "Failed to load tokens"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTakerTokens(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chainId, account]);

  const selectedMakerToken = useMemo(
    () => makerTokens.find((token) => token.contract === makerTokenAddress),
    [makerTokens, makerTokenAddress]
  );

  const selectedTakerToken = useMemo(
    () => takerTokens.find((token) => token.contract === takerTokenAddress),
    [takerTokens, takerTokenAddress]
  );

  const selectedProtocol = useMemo(
    () => protocols.protocols.find((protocol) => protocol.id === protocolId),
    [protocols.protocols, protocolId]
  );

  const computedAmount = useMemo(() => {
    if (!selectedMakerToken) return null;
    const balance = BigInt(selectedMakerToken.balance);

    if (amountPreset === "50") return (balance / 2n).toString();
    if (amountPreset === "100") return balance.toString();
    if (!customAmount.trim()) return null;

    try {
      const parsed = parseUnits(customAmount, selectedMakerToken.decimals);
      if (parsed <= 0n || parsed > balance) return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }, [selectedMakerToken, amountPreset, customAmount]);

  const amountError = useMemo(() => {
    if (
      amountPreset !== "custom" ||
      !selectedMakerToken ||
      !customAmount.trim()
    ) {
      return "";
    }
    try {
      const parsed = parseUnits(customAmount, selectedMakerToken.decimals);
      const balance = BigInt(selectedMakerToken.balance);
      if (parsed <= 0n) return "Amount must be greater than zero";
      if (parsed > balance) return "Amount exceeds balance";
    } catch {
      return "Enter a valid amount";
    }
    return "";
  }, [amountPreset, customAmount, selectedMakerToken]);

  const priceError = useMemo(() => {
    if (!limitPrice.trim()) return "";
    const parsed = Number(limitPrice);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return "Enter a price greater than zero";
    }
    return "";
  }, [limitPrice]);

  /** What the order pays out if filled at the limit price. */
  const projectedTakerAmount = useMemo(() => {
    if (
      !selectedMakerToken ||
      !selectedTakerToken ||
      !computedAmount ||
      priceError ||
      !limitPrice.trim()
    ) {
      return "";
    }
    const making = Number(
      formatUnits(BigInt(computedAmount), selectedMakerToken.decimals)
    );
    const taking = making * Number(limitPrice);
    return Number.isFinite(taking) ? taking.toString() : "";
  }, [
    selectedMakerToken,
    selectedTakerToken,
    computedAmount,
    limitPrice,
    priceError,
  ]);

  const formattedBalance = selectedMakerToken
    ? formatUnits(
        BigInt(selectedMakerToken.balance),
        selectedMakerToken.decimals
      )
    : "";

  const limitOrderParams: LimitOrderParams | null = useMemo(() => {
    if (
      !account ||
      !protocolId ||
      !selectedMakerToken ||
      !selectedTakerToken ||
      !computedAmount ||
      !limitPrice.trim() ||
      priceError
    ) {
      return null;
    }
    return {
      account: account as HexString,
      chainId,
      providerId: protocolId,
      makerToken: selectedMakerToken.contract as HexString,
      makingAmount: computedAmount,
      takerToken: selectedTakerToken.contract as HexString,
      limitPrice: limitPrice.trim(),
      expiry: Math.floor(Date.now() / 1000) + expiryMinutes * 60,
      slippage: DEFAULT_SLIPPAGE,
    };
  }, [
    account,
    chainId,
    protocolId,
    selectedMakerToken,
    selectedTakerToken,
    computedAmount,
    limitPrice,
    priceError,
    expiryMinutes,
  ]);

  return {
    isConnected,
    chainId,
    setChainId,
    protocols,
    protocolId,
    setProtocolId,
    selectedProtocol,
    makerTokens,
    loadingMakerTokens,
    makerTokenAddress,
    setMakerTokenAddress,
    selectedMakerToken,
    amountPreset,
    setAmountPreset,
    customAmount,
    setCustomAmount,
    amountError,
    formattedBalance,
    takerTokens,
    loadingTakerTokens,
    takerTokenAddress,
    setTakerTokenAddress,
    selectedTakerToken,
    limitPrice,
    setLimitPrice,
    priceError,
    projectedTakerAmount,
    expiryMinutes,
    setExpiryMinutes,
    fetchError,
    limitOrderParams,
  };
}
