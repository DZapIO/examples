import {
  EXPIRY_OPTIONS,
  type useLimitOrderSelection,
} from "../../hooks/useLimitOrderSelection";
import { SUPPORTED_CHAINS } from "../../lib/chains";
import Avatar from "../selector/Avatar";
import TokenSelectorField from "../selector/TokenSelectorField";
import AmountField from "../zap/AmountField";

type LimitOrderFormProps = {
  selection: ReturnType<typeof useLimitOrderSelection>;
  disabled?: boolean;
};

const fieldLabelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500";
const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800";

/**
 * Sell one token for another at a price you choose. Both legs are on one chain,
 * so a single chain picker drives both selectors.
 */
const LimitOrderForm = ({
  selection,
  disabled = false,
}: LimitOrderFormProps) => (
  <div className="space-y-1">
    <TokenSelectorField
      label="You sell"
      chains={SUPPORTED_CHAINS}
      selectedChainId={selection.chainId}
      onChainSelect={selection.setChainId}
      tokens={selection.makerTokens}
      loading={selection.loadingMakerTokens}
      selectedToken={selection.selectedMakerToken}
      onSelect={(token) => selection.setMakerTokenAddress(token.contract)}
      disabled={disabled}
    />

    {selection.selectedMakerToken && (
      <AmountField
        symbol={selection.selectedMakerToken.symbol}
        formattedBalance={selection.formattedBalance}
        preset={selection.amountPreset}
        onPresetChange={selection.setAmountPreset}
        customAmount={selection.customAmount}
        onCustomAmountChange={selection.setCustomAmount}
        amountError={selection.amountError}
        disabled={disabled}
      />
    )}

    <TokenSelectorField
      label="You receive"
      chains={SUPPORTED_CHAINS}
      selectedChainId={selection.chainId}
      onChainSelect={selection.setChainId}
      tokens={selection.takerTokens}
      loading={selection.loadingTakerTokens}
      selectedToken={selection.selectedTakerToken}
      onSelect={(token) => selection.setTakerTokenAddress(token.contract)}
      disabled={disabled}
    />

    <fieldset className="mb-4 space-y-4" disabled={disabled}>
      <div>
        <label className={fieldLabelClass} htmlFor="limit-price">
          Limit price
          {selection.selectedMakerToken && selection.selectedTakerToken && (
            <span className="ml-1 font-medium normal-case tracking-normal text-gray-400">
              ({selection.selectedTakerToken.symbol} per{" "}
              {selection.selectedMakerToken.symbol})
            </span>
          )}
        </label>
        <input
          id="limit-price"
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={selection.limitPrice}
          onChange={(event) => selection.setLimitPrice(event.target.value)}
          className={inputClass}
        />
        {selection.priceError && (
          <p className="mt-1 text-xs text-red-600">{selection.priceError}</p>
        )}
        {selection.projectedTakerAmount && selection.selectedTakerToken && (
          <p className="mt-1 text-xs text-gray-500">
            Fills for ≈ {selection.projectedTakerAmount}{" "}
            {selection.selectedTakerToken.symbol}
          </p>
        )}
      </div>

      <div>
        <label className={fieldLabelClass} htmlFor="limit-expiry">
          Expires in
        </label>
        <select
          id="limit-expiry"
          className={inputClass}
          value={selection.expiryMinutes}
          onChange={(event) =>
            selection.setExpiryMinutes(Number(event.target.value))
          }
        >
          {EXPIRY_OPTIONS.map((option) => (
            <option key={option.minutes} value={option.minutes}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {selection.protocols.protocols.length > 1 && (
        <div>
          <span className={fieldLabelClass}>Venue</span>
          <div className="flex flex-wrap gap-2">
            {selection.protocols.protocols.map((protocol) => (
              <button
                key={protocol.id}
                type="button"
                onClick={() => selection.setProtocolId(protocol.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  selection.protocolId === protocol.id
                    ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <Avatar src={protocol.icon} alt={protocol.name} size={20} />
                {protocol.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </fieldset>

    {(selection.fetchError || selection.protocols.error) && (
      <p className="mb-4 text-sm text-red-600">
        {selection.fetchError || selection.protocols.error}
      </p>
    )}

    {!selection.protocols.loading &&
      selection.protocols.protocols.length === 0 && (
        <p className="mb-4 text-sm text-red-600">
          No limit-order venue supports this chain yet.
        </p>
      )}
  </div>
);

export default LimitOrderForm;
