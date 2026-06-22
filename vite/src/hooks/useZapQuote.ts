import { useEffect, useState } from "react";
import type { PreparedZap } from "../lib/zap";

/**
 * Fetches a zap quote whenever the (memoized) params change. Returns the
 * prepared request + quote, plus loading/error state, so the page can show the
 * quote and only then enable the confirm button.
 */
export function useZapQuote<TParams>(
  params: TParams | null,
  prepare: (params: TParams) => Promise<PreparedZap>
) {
  const [prepared, setPrepared] = useState<PreparedZap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params) {
      setPrepared(null);
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setPrepared(null);

    prepare(params)
      .then((result) => {
        if (!cancelled) setPrepared(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch quote");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params, prepare]);

  return { prepared, loading, error };
}
