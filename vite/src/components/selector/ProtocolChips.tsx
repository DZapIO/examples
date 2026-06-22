import type { ZapProtocol } from "../../types/zap";
import Avatar from "./Avatar";

/** How many protocol chips fit comfortably on one line before overflowing. */
const VISIBLE_LIMIT = 5;

type ProtocolChipsProps = {
  protocols: ZapProtocol[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (protocolId: string) => void;
  /** Opens the full protocol list when there are more than fit inline. */
  onShowAll: () => void;
};

/**
 * Inline protocol picker: shows up to `VISIBLE_LIMIT` protocols (keeping the
 * selected one in view) and a "+N" chip that opens the full list.
 */
const ProtocolChips = ({
  protocols,
  loading,
  selectedId,
  onSelect,
  onShowAll,
}: ProtocolChipsProps) => {
  if (loading) {
    return <p className="px-1 py-2 text-sm text-gray-500">Loading protocols…</p>;
  }
  if (protocols.length === 0) {
    return (
      <p className="px-1 py-2 text-sm text-gray-500">
        No protocols on this chain
      </p>
    );
  }

  // Keep the selected protocol visible by moving it to the front.
  const selected = protocols.find((protocol) => protocol.id === selectedId);
  const ordered = selected
    ? [selected, ...protocols.filter((protocol) => protocol.id !== selectedId)]
    : protocols;

  const visible = ordered.slice(0, VISIBLE_LIMIT);
  const hiddenCount = protocols.length - visible.length;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((protocol) => {
        const isSelected = protocol.id === selectedId;
        return (
          <button
            key={protocol.id}
            type="button"
            onClick={() => onSelect(protocol.id)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              isSelected
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <Avatar src={protocol.icon} alt={protocol.name} size={20} />
            {protocol.name}
          </button>
        );
      })}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={onShowAll}
          className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-300"
        >
          +{hiddenCount} more
        </button>
      )}
    </div>
  );
};

export default ProtocolChips;
