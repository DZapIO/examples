import type { useZapOutSelection } from "../../hooks/useZapOutSelection";
import { SUPPORTED_CHAINS } from "../../lib/chains";
import PositionSelectorField from "../selector/PositionSelectorField";
import TokenSelectorField from "../selector/TokenSelectorField";

type ZapOutFormProps = {
  selection: ReturnType<typeof useZapOutSelection>;
  disabled?: boolean;
};

/** Source position selected by protocol → destination token on any chain. */
const ZapOutForm = ({ selection, disabled = false }: ZapOutFormProps) => (
  <div className="space-y-1">
    <PositionSelectorField
      label="Source position"
      chains={SUPPORTED_CHAINS}
      selectedChainId={selection.srcChainId}
      onChainSelect={selection.setSrcChainId}
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

    <TokenSelectorField
      label="Destination token"
      chains={SUPPORTED_CHAINS}
      selectedChainId={selection.destChainId}
      onChainSelect={selection.setDestChainId}
      tokens={selection.destTokens}
      loading={selection.loadingDestTokens}
      selectedToken={selection.selectedDestToken}
      onSelect={(token) => selection.setDestTokenAddress(token.contract)}
      disabled={disabled}
    />

    {(selection.fetchError || selection.protocols.error) && (
      <p className="mb-4 text-sm text-red-600">
        {selection.fetchError || selection.protocols.error}
      </p>
    )}
  </div>
);

export default ZapOutForm;
