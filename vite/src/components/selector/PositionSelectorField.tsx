import type { ZapPosition } from "@dzapio/sdk";
import { useMemo, useState } from "react";
import { getChainColor } from "../../lib/chainMeta";
import type { ZapProtocol } from "../../types/zap";
import AssetSelectorModal from "./AssetSelectorModal";
import Avatar from "./Avatar";
import ListMessage from "./ListMessage";
import ProtocolChips from "./ProtocolChips";
import ProtocolPickerModal from "./ProtocolPickerModal";
import Row from "./Row";
import SelectorTrigger from "./SelectorTrigger";

type PositionSelectorFieldProps = {
  label: string;
  chains: readonly { id: number; name: string }[];
  selectedChainId: number;
  onChainSelect: (chainId: number) => void;
  protocols: { protocols: ZapProtocol[]; loading: boolean };
  selectedProtocol?: ZapProtocol;
  selectedProtocolId: string | null;
  onProtocolSelect: (protocolId: string) => void;
  positions: ZapPosition[];
  loadingPositions: boolean;
  selectedPosition?: ZapPosition;
  onSelect: (position: ZapPosition) => void;
  disabled?: boolean;
};

const underlyingSymbols = (position: ZapPosition) =>
  position.underlyingAssets.map((asset) => asset.symbol).join(" / ");

const formatUsd = (amountUSD: string) => {
  const value = Number(amountUSD);
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : undefined;
};

/** Selects a chain → protocol → open position to zap out of. */
const PositionSelectorField = ({
  label,
  chains,
  selectedChainId,
  onChainSelect,
  protocols,
  selectedProtocol,
  selectedProtocolId,
  onProtocolSelect,
  positions,
  loadingPositions,
  selectedPosition,
  onSelect,
  disabled,
}: PositionSelectorFieldProps) => {
  const [open, setOpen] = useState(false);
  const [protocolPickerOpen, setProtocolPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return positions;
    return positions.filter((position) =>
      `${position.name} ${underlyingSymbols(position)}`
        .toLowerCase()
        .includes(query)
    );
  }, [positions, search]);

  const chainName =
    chains.find((chain) => chain.id === selectedChainId)?.name ?? "";

  return (
    <>
      <SelectorTrigger
        label={label}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {selectedPosition && selectedProtocol ? (
          <>
            <Avatar
              src={selectedProtocol.icon}
              alt={selectedProtocol.name}
              size={24}
            />
            <span className="truncate font-semibold text-gray-800">
              {selectedPosition.name}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: getChainColor(selectedChainId) }}
              />
              {chainName}
            </span>
          </>
        ) : (
          <span className="text-gray-400">Select position on {chainName}</span>
        )}
      </SelectorTrigger>

      <AssetSelectorModal
        open={open}
        onClose={() => setOpen(false)}
        title="Select position"
        chains={chains}
        selectedChainId={selectedChainId}
        onChainSelect={onChainSelect}
        tabs={[{ id: "protocol", label: "Protocol" }]}
        activeTab="protocol"
        onTabChange={() => {}}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search positions"
        listHeader={
          <ProtocolChips
            protocols={protocols.protocols}
            loading={protocols.loading}
            selectedId={selectedProtocolId}
            onSelect={onProtocolSelect}
            onShowAll={() => setProtocolPickerOpen(true)}
          />
        }
      >
        {!selectedProtocolId ? (
          <ListMessage>Pick a protocol to see your positions</ListMessage>
        ) : loadingPositions ? (
          <ListMessage>Loading positions…</ListMessage>
        ) : filtered.length === 0 ? (
          <ListMessage>No open positions</ListMessage>
        ) : (
          filtered.map((position) => (
            <Row
              key={position.address}
              selected={position.address === selectedPosition?.address}
              leading={
                <Avatar
                  src={position.underlyingAssets[0]?.logo}
                  alt={position.name}
                />
              }
              title={position.name}
              subtitle={underlyingSymbols(position)}
              trailingTop={formatUsd(position.amountUSD)}
              trailingBottom={
                position.apr ? `${position.apr.toFixed(2)}% APR` : undefined
              }
              onClick={() => {
                onSelect(position);
                setOpen(false);
              }}
            />
          ))
        )}
      </AssetSelectorModal>

      <ProtocolPickerModal
        open={protocolPickerOpen}
        onClose={() => setProtocolPickerOpen(false)}
        protocols={protocols.protocols}
        selectedId={selectedProtocolId}
        onSelect={onProtocolSelect}
      />
    </>
  );
};

export default PositionSelectorField;
