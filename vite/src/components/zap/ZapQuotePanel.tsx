import type { ZapQuoteResponse } from "@dzapio/sdk";
import { formatUnits } from "viem";

/** Format a raw or already-decimal amount string for display. */
const formatAmount = (amount: string, decimals: number) => {
  const value = amount.includes(".")
    ? Number(amount)
    : Number(formatUnits(BigInt(amount || "0"), decimals));
  if (!Number.isFinite(value)) return amount;
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
};

const formatUsd = (amountUSD: string) => {
  const value = Number(amountUSD);
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : undefined;
};

/** Shows the expected output of a zap so the user can review before confirming. */
const ZapQuotePanel = ({ quote }: { quote: ZapQuoteResponse }) => (
  <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
      You receive
    </p>
    <div className="space-y-2">
      {quote.output.map((item, index) => (
        <div
          key={`${item.asset.address}-${index}`}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            {item.asset.logo && (
              <img
                src={item.asset.logo}
                alt=""
                className="h-5 w-5 rounded-full bg-gray-100 object-cover"
              />
            )}
            <span className="text-sm font-medium text-gray-800">
              {formatAmount(item.amount, item.asset.decimals)} {item.asset.symbol}
            </span>
          </div>
          {formatUsd(item.amountUSD) && (
            <span className="text-sm text-gray-500">
              {formatUsd(item.amountUSD)}
            </span>
          )}
        </div>
      ))}
    </div>
  </div>
);

export default ZapQuotePanel;
