import type { TokenInfo } from "@dzapio/sdk";
import { useMemo, useState } from "react";
import { formatUnits, zeroAddress } from "viem";
import { getChainColor } from "../../lib/chainMeta";
import AssetSelectorModal from "./AssetSelectorModal";
import Avatar from "./Avatar";
import ListMessage from "./ListMessage";
import Row from "./Row";
import SelectorTrigger from "./SelectorTrigger";

type TokenSelectorFieldProps = {
  label: string;
  chains: readonly { id: number; name: string }[];
  selectedChainId: number;
  onChainSelect: (chainId: number) => void;
  tokens: TokenInfo[];
  loading: boolean;
  selectedToken?: TokenInfo;
  onSelect: (token: TokenInfo) => void;
  disabled?: boolean;
};

const formatBalance = (token: TokenInfo) => {
  const amount = Number(formatUnits(BigInt(token.balance), token.decimals));
  if (!Number.isFinite(amount)) return token.balance;
  return amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
};

const NativeBadge = () => (
  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
    Native
  </span>
);

/** Selects a chain + token from balances, in a modal matching the zap UI. */
const TokenSelectorField = ({
  label,
  chains,
  selectedChainId,
  onChainSelect,
  tokens,
  loading,
  selectedToken,
  onSelect,
  disabled,
}: TokenSelectorFieldProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tokens;
    return tokens.filter((token) =>
      `${token.symbol} ${token.name} ${token.contract}`
        .toLowerCase()
        .includes(query)
    );
  }, [tokens, search]);

  const chainName =
    chains.find((chain) => chain.id === selectedChainId)?.name ?? "";

  return (
    <>
      <SelectorTrigger
        label={label}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {selectedToken ? (
          <>
            <Avatar src={selectedToken.logo} alt={selectedToken.symbol} size={24} />
            <span className="truncate font-semibold text-gray-800">
              {selectedToken.symbol}
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
          <span className="text-gray-400">Select token on {chainName}</span>
        )}
      </SelectorTrigger>

      <AssetSelectorModal
        open={open}
        onClose={() => setOpen(false)}
        title="Select token"
        chains={chains}
        selectedChainId={selectedChainId}
        onChainSelect={onChainSelect}
        tabs={[{ id: "tokens", label: "Tokens" }]}
        activeTab="tokens"
        onTabChange={() => {}}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tokens"
      >
        {loading ? (
          <ListMessage>Loading tokens…</ListMessage>
        ) : filtered.length === 0 ? (
          <ListMessage>No tokens found</ListMessage>
        ) : (
          filtered.map((token) => (
            <Row
              key={token.contract}
              selected={token.contract === selectedToken?.contract}
              leading={<Avatar src={token.logo} alt={token.symbol} />}
              title={token.symbol}
              titleBadge={
                token.contract === zeroAddress ? <NativeBadge /> : undefined
              }
              subtitle={token.name}
              trailingTop={formatBalance(token)}
              trailingBottom={
                token.balanceInUsd
                  ? `$${token.balanceInUsd.toFixed(2)}`
                  : undefined
              }
              onClick={() => {
                onSelect(token);
                setOpen(false);
              }}
            />
          ))
        )}
      </AssetSelectorModal>
    </>
  );
};

export default TokenSelectorField;
