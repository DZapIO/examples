import type { useZapInSelection } from "../../hooks/useZapInSelection";
import { SUPPORTED_CHAINS } from "../../lib/chains";
import PoolSelectorField from "../selector/PoolSelectorField";
import TokenSelectorField from "../selector/TokenSelectorField";
import AmountField from "./AmountField";

type ZapInFormProps = {
  selection: ReturnType<typeof useZapInSelection>;
  disabled?: boolean;
};

/** Source token (+ amount) → destination pool selected by protocol. */
const ZapInForm = ({ selection, disabled = false }: ZapInFormProps) => (
  <div className="space-y-1">
    <TokenSelectorField
      label="Source token"
      chains={SUPPORTED_CHAINS}
      selectedChainId={selection.srcChainId}
      onChainSelect={selection.setSrcChainId}
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

    <PoolSelectorField
      label="Destination pool"
      chains={SUPPORTED_CHAINS}
      selectedChainId={selection.destChainId}
      onChainSelect={selection.setDestChainId}
      protocols={selection.protocols}
      selectedProtocol={selection.selectedProtocol}
      selectedProtocolId={selection.protocolId}
      onProtocolSelect={selection.setProtocolId}
      pools={selection.pools}
      loadingPools={selection.loadingPools}
      selectedPool={selection.selectedPool}
      onSelect={(pool) => selection.setPoolAddress(pool.address)}
      disabled={disabled}
    />

    {(selection.fetchError || selection.protocols.error) && (
      <p className="mb-4 text-sm text-red-600">
        {selection.fetchError || selection.protocols.error}
      </p>
    )}
  </div>
);

export default ZapInForm;
