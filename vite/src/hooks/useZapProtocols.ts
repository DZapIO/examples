import { useEffect, useState } from "react";
import { fetchZapProtocols } from "../lib/zapData";
import type { ZapProtocol } from "../types/zap";

/** Loads the zap protocols available on a chain, reloading when it changes. */
export function useZapProtocols(chainId: number) {
  const [protocols, setProtocols] = useState<ZapProtocol[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetchZapProtocols(chainId)
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
  }, [chainId]);

  return { protocols, loading, error };
}
