import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ZapProtocol } from "../../types/zap";
import Avatar from "./Avatar";
import ListMessage from "./ListMessage";
import Row from "./Row";

type ProtocolPickerModalProps = {
  open: boolean;
  onClose: () => void;
  protocols: ZapProtocol[];
  selectedId: string | null;
  onSelect: (protocolId: string) => void;
};

/** Full, searchable protocol list — opened from the "+N more" chip. */
const ProtocolPickerModal = ({
  open,
  onClose,
  protocols,
  selectedId,
  onSelect,
}: ProtocolPickerModalProps) => {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return protocols;
    return protocols.filter((protocol) =>
      protocol.name.toLowerCase().includes(query)
    );
  }, [protocols, search]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h3 className="text-lg font-semibold text-gray-900">Select protocol</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pt-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search protocols"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10"
          />
        </div>

        <div className="mt-3 h-80 overflow-y-auto px-2 pb-3">
          {filtered.length === 0 ? (
            <ListMessage>No protocols found</ListMessage>
          ) : (
            filtered.map((protocol) => (
              <Row
                key={protocol.id}
                selected={protocol.id === selectedId}
                leading={<Avatar src={protocol.icon} alt={protocol.name} />}
                title={protocol.name}
                onClick={() => {
                  onSelect(protocol.id);
                  onClose();
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProtocolPickerModal;
