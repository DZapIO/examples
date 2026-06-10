import type { TokenInfo } from "@dzapio/sdk";
import { formatUnits } from "viem";
import { SUPPORTED_CHAINS } from "../lib/chains";
import type { AmountPreset } from "../hooks/useTradeSelection";

type TradeFormProps = {
  sourceChainId: number;
  destChainId: number | null;
  balanceTokens: TokenInfo[];
  destTokens: TokenInfo[];
  loadingBalances: boolean;
  loadingDestTokens: boolean;
  fetchError: string;
  srcTokenAddress: string | null;
  destTokenAddress: string | null;
  onSrcTokenChange: (address: string) => void;
  onDestTokenChange: (address: string) => void;
  onSourceChainChange: (chainId: number) => void;
  onDestChainChange: (chainId: number) => void;
  amountPreset: AmountPreset;
  onAmountPresetChange: (preset: AmountPreset) => void;
  customAmount: string;
  onCustomAmountChange: (value: string) => void;
  amountError: string;
  formattedBalance: string;
  selectedSrcToken?: TokenInfo;
  disabled?: boolean;
};

const formatTokenBalance = (token: TokenInfo) => {
  const balance = formatUnits(BigInt(token.balance), token.decimals);
  const numericBalance = Number(balance);
  const displayBalance = Number.isFinite(numericBalance)
    ? numericBalance.toLocaleString(undefined, {
        maximumFractionDigits: 6,
      })
    : balance;

  return `${displayBalance} ${token.symbol}`;
};

const ChainSelector = ({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number | null;
  onChange: (chainId: number) => void;
  disabled?: boolean;
}) => (
  <fieldset className="mb-4" disabled={disabled}>
    <legend className="text-sm font-medium text-gray-700 mb-2">{label}</legend>
    <div className="grid grid-cols-2 gap-2">
      {SUPPORTED_CHAINS.map((chain) => (
        <button
          key={chain.id}
          type="button"
          onClick={() => onChange(chain.id)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            value === chain.id
              ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600"
              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
          }`}
        >
          {chain.name}
        </button>
      ))}
    </div>
  </fieldset>
);

const TradeForm = ({
  sourceChainId,
  destChainId,
  balanceTokens,
  destTokens,
  loadingBalances,
  loadingDestTokens,
  fetchError,
  srcTokenAddress,
  destTokenAddress,
  onSrcTokenChange,
  onDestTokenChange,
  onSourceChainChange,
  onDestChainChange,
  amountPreset,
  onAmountPresetChange,
  customAmount,
  onCustomAmountChange,
  amountError,
  formattedBalance,
  selectedSrcToken,
  disabled = false,
}: TradeFormProps) => (
  <div className="space-y-1">
    <ChainSelector
      label="Source chain"
      value={sourceChainId}
      onChange={onSourceChainChange}
      disabled={disabled}
    />

    <label className="block mb-4">
      <span className="text-sm font-medium text-gray-700">Source token</span>
      <select
        value={srcTokenAddress ?? ""}
        onChange={(event) => onSrcTokenChange(event.target.value)}
        disabled={disabled || loadingBalances || balanceTokens.length === 0}
        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-100"
      >
        <option value="">
          {loadingBalances
            ? "Loading balances..."
            : balanceTokens.length === 0
              ? "No tokens with balance"
              : "Select a token"}
        </option>
        {balanceTokens.map((token) => (
          <option key={token.contract} value={token.contract}>
            {token.symbol} — {formatTokenBalance(token)}
          </option>
        ))}
      </select>
    </label>

    {selectedSrcToken && (
      <fieldset className="mb-4" disabled={disabled}>
        <legend className="text-sm font-medium text-gray-700 mb-2">
          Amount
          <span className="ml-2 font-normal text-gray-500">
            Balance: {formattedBalance} {selectedSrcToken.symbol}
          </span>
        </legend>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {(["50", "100", "custom"] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onAmountPresetChange(preset)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                amountPreset === preset
                  ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {preset === "custom" ? "Custom" : `${preset}%`}
            </button>
          ))}
        </div>
        {amountPreset === "custom" && (
          <input
            type="text"
            inputMode="decimal"
            placeholder={`Enter amount in ${selectedSrcToken.symbol}`}
            value={customAmount}
            onChange={(event) => onCustomAmountChange(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
          />
        )}
        {amountError && (
          <p className="mt-1 text-xs text-red-600">{amountError}</p>
        )}
      </fieldset>
    )}

    <ChainSelector
      label="Destination chain"
      value={destChainId}
      onChange={onDestChainChange}
      disabled={disabled}
    />

    {destChainId !== null && (
      <label className="block mb-4">
        <span className="text-sm font-medium text-gray-700">
          Destination token
        </span>
        <select
          value={destTokenAddress ?? ""}
          onChange={(event) => onDestTokenChange(event.target.value)}
          disabled={disabled || loadingDestTokens || destTokens.length === 0}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 disabled:bg-gray-100"
        >
          <option value="">
            {loadingDestTokens
              ? "Loading tokens..."
              : destTokens.length === 0
                ? "No tokens available"
                : "Select a token"}
          </option>
          {destTokens.map((token) => (
            <option key={token.contract} value={token.contract}>
              {token.symbol}
            </option>
          ))}
        </select>
      </label>
    )}

    {fetchError && (
      <p className="mb-4 text-sm text-red-600">{fetchError}</p>
    )}
  </div>
);

export default TradeForm;
