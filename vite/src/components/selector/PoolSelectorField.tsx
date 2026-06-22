import type { ZapPool } from "@dzapio/sdk";
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

type PoolSelectorFieldProps = {
  label: string;
  chains: readonly { id: number; name: string }[];
  selectedChainId: number;
  onChainSelect: (chainId: number) => void;
  protocols: { protocols: ZapProtocol[]; loading: boolean };
  selectedProtocol?: ZapProtocol;
  selectedProtocolId: string | null;
  onProtocolSelect: (protocolId: string) => void;
  pools: ZapPool[];
  loadingPools: boolean;
  selectedPool?: ZapPool;
  onSelect: (pool: ZapPool) => void;
  disabled?: boolean;
};

const underlyingSymbols = (pool: ZapPool) =>
  pool.underlyingAssets.map((asset) => asset.symbol).join(" / ");

const formatTvl = (tvl: string) => {
  const value = Number(tvl);
  if (!Number.isFinite(value) || value === 0) return undefined;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} TVL`;
};

/** Selects a chain → protocol → pool to zap into. */
const PoolSelectorField = ({
  label,
  chains,
  selectedChainId,
  onChainSelect,
  protocols,
  selectedProtocol,
  selectedProtocolId,
  onProtocolSelect,
  pools,
  loadingPools,
  selectedPool,
  onSelect,
  disabled,
}: PoolSelectorFieldProps) => {
  const [open, setOpen] = useState(false);
  const [protocolPickerOpen, setProtocolPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pools;
    return pools.filter((pool) =>
      `${pool.name} ${pool.symbol} ${underlyingSymbols(pool)}`
        .toLowerCase()
        .includes(query)
    );
  }, [pools, search]);

  const chainName =
    chains.find((chain) => chain.id === selectedChainId)?.name ?? "";

  return (
    <>
      <SelectorTrigger
        label={label}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {selectedPool && selectedProtocol ? (
          <>
            <Avatar
              src={selectedProtocol.icon}
              alt={selectedProtocol.name}
              size={24}
            />
            <span className="truncate font-semibold text-gray-800">
              {selectedPool.name || selectedPool.symbol}
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
          <span className="text-gray-400">Select pool on {chainName}</span>
        )}
      </SelectorTrigger>

      <AssetSelectorModal
        open={open}
        onClose={() => setOpen(false)}
        title="Select pool"
        chains={chains}
        selectedChainId={selectedChainId}
        onChainSelect={onChainSelect}
        tabs={[{ id: "protocol", label: "Protocol" }]}
        activeTab="protocol"
        onTabChange={() => {}}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search pools"
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
          <ListMessage>Pick a protocol to see its pools</ListMessage>
        ) : loadingPools ? (
          <ListMessage>Loading pools…</ListMessage>
        ) : filtered.length === 0 ? (
          <ListMessage>No pools found</ListMessage>
        ) : (
          filtered.map((pool) => (
            <Row
              key={pool.address}
              selected={pool.address === selectedPool?.address}
              leading={
                <Avatar
                  src={pool.underlyingAssets[0]?.logo}
                  alt={pool.symbol || pool.name}
                />
              }
              title={pool.name || pool.symbol}
              subtitle={underlyingSymbols(pool)}
              trailingTop={pool.apr ? `${pool.apr.toFixed(2)}% APR` : undefined}
              trailingBottom={formatTvl(pool.tvl)}
              onClick={() => {
                onSelect(pool);
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

export default PoolSelectorField;
