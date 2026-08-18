import type { AmountPreset } from "../../types/amount";

type AmountFieldProps = {
  /** Ticker of the asset being spent — a token symbol, or a position's name. */
  symbol: string;
  formattedBalance: string;
  /** What the balance line calls the amount held, e.g. "Balance" or "Position". */
  balanceLabel?: string;
  preset: AmountPreset;
  onPresetChange: (preset: AmountPreset) => void;
  customAmount: string;
  onCustomAmountChange: (value: string) => void;
  amountError: string;
  disabled?: boolean;
};

/** 50% / 100% / custom amount picker for the source asset. */
const AmountField = ({
  symbol,
  formattedBalance,
  balanceLabel = "Balance",
  preset,
  onPresetChange,
  customAmount,
  onCustomAmountChange,
  amountError,
  disabled,
}: AmountFieldProps) => (
  <fieldset className="mb-4" disabled={disabled}>
    <legend className="mb-1.5 flex w-full items-baseline justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
      <span>Amount</span>
      <span className="font-medium normal-case tracking-normal text-gray-400">
        {balanceLabel}: {formattedBalance} {symbol}
      </span>
    </legend>
    <div className="grid grid-cols-3 gap-2 mb-2">
      {(["50", "100", "custom"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onPresetChange(option)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            preset === option
              ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600"
              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
          }`}
        >
          {option === "custom" ? "Custom" : `${option}%`}
        </button>
      ))}
    </div>
    {preset === "custom" && (
      <input
        type="text"
        inputMode="decimal"
        placeholder={`Enter amount in ${symbol}`}
        value={customAmount}
        onChange={(event) => onCustomAmountChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
      />
    )}
    {amountError && <p className="mt-1 text-xs text-red-600">{amountError}</p>}
  </fieldset>
);

export default AmountField;
