import { formatUnits } from "viem";
import type { SelectedTradeQuote } from "../types/trade";

const formatAmount = (amount: string, decimals: number) => {
  const value = amount.includes(".")
    ? Number(amount)
    : Number(formatUnits(BigInt(amount || "0"), decimals));
  if (!Number.isFinite(value)) return amount;
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
};

/** Shows the expected output of a trade so the user can review before confirming. */
const TradeQuotePanel = ({ quote }: { quote: SelectedTradeQuote }) => {
  const usd = Number(quote.destAmountUSD);
  const impact = Number(quote.priceImpactPercent);

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        You receive
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {quote.destToken.logo && (
            <img
              src={quote.destToken.logo}
              alt=""
              className="h-5 w-5 rounded-full bg-gray-100 object-cover"
            />
          )}
          <span className="text-sm font-medium text-gray-800">
            {formatAmount(quote.destAmount, quote.destToken.decimals)}{" "}
            {quote.destToken.symbol}
          </span>
        </div>
        {Number.isFinite(usd) && (
          <span className="text-sm text-gray-500">${usd.toFixed(2)}</span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>via {quote.providerDetails.name}</span>
        {Number.isFinite(impact) && <span>{impact.toFixed(2)}% price impact</span>}
      </div>
    </div>
  );
};

export default TradeQuotePanel;
