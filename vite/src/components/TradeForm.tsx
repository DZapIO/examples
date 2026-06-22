import type { useTradeSelection } from "../hooks/useTradeSelection";
import { SUPPORTED_CHAINS } from "../lib/chains";
import TokenSelectorField from "./selector/TokenSelectorField";
import AmountField from "./zap/AmountField";

type TradeFormProps = {
  selection: ReturnType<typeof useTradeSelection>;
  disabled?: boolean;
};

/** Source token (+ amount) → destination token, for a swap or bridge. */
const TradeForm = ({ selection, disabled = false }: TradeFormProps) => (
  <div className="space-y-1">
    <TokenSelectorField
      label="Source token"
      chains={SUPPORTED_CHAINS}
      selectedChainId={selection.sourceChainId}
      onChainSelect={selection.handleSourceChainChange}
      tokens={selection.balanceTokens}
      loading={selection.loadingBalances}
      selectedToken={selection.selectedSrcToken}
      onSelect={(token) => selection.setSrcTokenAddress(token.contract)}
      disabled={disabled}
    />

    {selection.selectedSrcToken && (
      <AmountField
        token={selection.selectedSrcToken}
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
      label="Destination token"
      chains={SUPPORTED_CHAINS}
      selectedChainId={selection.destChainId}
      onChainSelect={selection.handleDestChainChange}
      tokens={selection.destTokens}
      loading={selection.loadingDestTokens}
      selectedToken={selection.selectedDestToken}
      onSelect={(token) => selection.setDestTokenAddress(token.contract)}
      disabled={disabled}
    />

    {selection.fetchError && (
      <p className="mb-4 text-sm text-red-600">{selection.fetchError}</p>
    )}
  </div>
);

export default TradeForm;
