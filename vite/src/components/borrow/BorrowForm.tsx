import type { useBorrowSelection } from "../../hooks/useBorrowSelection";
import { SUPPORTED_CHAINS } from "../../lib/chains";
import PositionSelectorField from "../selector/PositionSelectorField";
import TokenSelectorField from "../selector/TokenSelectorField";
import AmountField from "../zap/AmountField";

type BorrowFormProps = {
  selection: ReturnType<typeof useBorrowSelection>;
  disabled?: boolean;
};

/**
 * Collateral position (picked by lending protocol) + how much of it to draw
 * against → the asset to borrow. Both legs are on the same chain, so the one
 * chain picker inside the position selector drives the whole form.
 */
const BorrowForm = ({ selection, disabled = false }: BorrowFormProps) => (
  <div className="space-y-1">
    <PositionSelectorField
      label="Collateral position"
      chains={SUPPORTED_CHAINS}
      selectedChainId={selection.chainId}
      onChainSelect={selection.setChainId}
      protocols={selection.protocols}
      selectedProtocol={selection.selectedProtocol}
      selectedProtocolId={selection.protocolId}
      onProtocolSelect={selection.setProtocolId}
      positions={selection.positions}
      loadingPositions={selection.loadingPositions}
      selectedPosition={selection.selectedPosition}
      onSelect={(position) => selection.setPositionAddress(position.address)}
      disabled={disabled}
    />

    {selection.selectedPosition && (
      <AmountField
        symbol={selection.selectedPosition.name}
        formattedBalance={selection.formattedPositionBalance}
        balanceLabel="Position"
        preset={selection.amountPreset}
        onPresetChange={selection.setAmountPreset}
        customAmount={selection.customAmount}
        onCustomAmountChange={selection.setCustomAmount}
        amountError={selection.amountError}
        disabled={disabled}
      />
    )}

    <TokenSelectorField
      label="Asset to borrow"
      chains={SUPPORTED_CHAINS}
      selectedChainId={selection.chainId}
      onChainSelect={selection.setChainId}
      tokens={selection.borrowTokens}
      loading={selection.loadingBorrowTokens}
      selectedToken={selection.selectedBorrowToken}
      onSelect={(token) => selection.setBorrowTokenAddress(token.contract)}
      disabled={disabled}
    />

    {(selection.fetchError || selection.protocols.error) && (
      <p className="mb-4 text-sm text-red-600">
        {selection.fetchError || selection.protocols.error}
      </p>
    )}
  </div>
);

export default BorrowForm;
