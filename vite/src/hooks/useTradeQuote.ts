import { useEffect, useState } from "react";
import { prepareTrade, type PreparedTrade } from "../lib/trade";
import type { TradeParams, TradeQuoteOptions } from "../types/trade";

/**
 * Fetches a trade quote whenever the (memoized) params change, so the page can
 * show it and only then enable the confirm button.
 */
export function useTradeQuote(
  params: TradeParams | null,
  quoteOptions?: TradeQuoteOptions
) {
  const [prepared, setPrepared] = useState<PreparedTrade | null>(null);
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

    prepareTrade(params, quoteOptions)
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
  }, [params, quoteOptions]);

  return { prepared, loading, error };
}
