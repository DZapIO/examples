import type { HexString, TokenInfo, ZapPosition } from "@dzapio/sdk";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { DEFAULT_CHAIN } from "../lib/chains";
import { fetchChainTokens } from "../lib/token";
import { fetchZapPositions } from "../lib/zapData";
import type { ZapOutParams } from "../types/zap";
import { useZapProtocols } from "./useZapProtocols";

const DEFAULT_SLIPPAGE = 1;

/**
 * Drives the Zap Out form: a protocol position on the source chain withdrawn
 * into any chain's token.
 */
export function useZapOutSelection() {
  const { address: account, isConnected } = useAccount();

  const [srcChainId, setSrcChainId] = useState<number>(DEFAULT_CHAIN.id);
  const [protocolId, setProtocolId] = useState<string | null>(null);
  const [positionAddress, setPositionAddress] = useState<string | null>(null);

  const [destChainId, setDestChainId] = useState<number>(DEFAULT_CHAIN.id);
  const [destTokenAddress, setDestTokenAddress] = useState<string | null>(null);

  const [positions, setPositions] = useState<ZapPosition[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [destTokens, setDestTokens] = useState<TokenInfo[]>([]);
  const [loadingDestTokens, setLoadingDestTokens] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const protocols = useZapProtocols(srcChainId);

  // The account's positions in the selected protocol on the source chain.
  useEffect(() => {
    if (!account || !isConnected || !protocolId) {
      setPositions([]);
      setPositionAddress(null);
      return;
    }

    let cancelled = false;
    setLoadingPositions(true);
    setFetchError("");

    fetchZapPositions(account as HexString, srcChainId, protocolId)
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
  }, [account, isConnected, srcChainId, protocolId]);

  // Tokens the user can receive on the destination chain.
  useEffect(() => {
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
        if (!cancelled) setLoadingDestTokens(false);
      });

    return () => {
      cancelled = true;
    };
  }, [destChainId, account]);

  const selectedPosition = useMemo(
    () => positions.find((position) => position.address === positionAddress),
    [positions, positionAddress]
  );

  const selectedDestToken = useMemo(
    () => destTokens.find((token) => token.contract === destTokenAddress),
    [destTokens, destTokenAddress]
  );

  const selectedProtocol = useMemo(
    () => protocols.protocols.find((protocol) => protocol.id === protocolId),
    [protocols.protocols, protocolId]
  );

  const zapOutParams: ZapOutParams | null = useMemo(() => {
    if (!account || !selectedPosition || !selectedDestToken) {
      return null;
    }
    return {
      account: account as HexString,
      position: selectedPosition,
      amount: selectedPosition.amount,
      destChainId,
      destToken: selectedDestToken.contract as HexString,
      slippage: DEFAULT_SLIPPAGE,
    };
  }, [account, selectedPosition, selectedDestToken, destChainId]);

  return {
    isConnected,
    srcChainId,
    setSrcChainId,
    protocols,
    protocolId,
    setProtocolId,
    selectedProtocol,
    positions,
    loadingPositions,
    positionAddress,
    setPositionAddress,
    selectedPosition,
    destChainId,
    setDestChainId,
    destTokens,
    loadingDestTokens,
    destTokenAddress,
    setDestTokenAddress,
    selectedDestToken,
    fetchError,
    zapOutParams,
  };
}
