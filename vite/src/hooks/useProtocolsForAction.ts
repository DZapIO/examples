import { useEffect, useState } from "react";
import { fetchProtocolsForAction } from "../lib/zapData";
import type { ZapProtocol } from "../types/zap";

/**
 * Loads the protocols supporting a given action on a chain, reloading when
 * either changes. Same shape as `useZapProtocols`, so it drops straight into
 * the protocol-aware selector fields.
 */
export function useProtocolsForAction(chainId: number, action: string) {
  const [protocols, setProtocols] = useState<ZapProtocol[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetchProtocolsForAction(chainId, action)
      .then((result) => {
        if (!cancelled) setProtocols(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load protocols"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chainId, action]);

  return { protocols, loading, error };
}
