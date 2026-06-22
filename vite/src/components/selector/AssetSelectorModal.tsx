import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ChainIconRow from "./ChainIconRow";

type TabDef = { id: string; label: string };

type AssetSelectorModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  chains: readonly { id: number; name: string }[];
  selectedChainId: number;
  onChainSelect: (chainId: number) => void;
  tabs: TabDef[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Optional content pinned above the scrolling list (e.g. protocol chips). */
  listHeader?: ReactNode;
  children: ReactNode;
};

/**
 * Dark, full-screen-overlay selector modal: a chain switcher, tabbed search,
 * and a scrollable result list (`children`). Shared by every zap selector.
 */
const AssetSelectorModal = ({
  open,
  onClose,
  title,
  chains,
  selectedChainId,
  onChainSelect,
  tabs,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  searchPlaceholder = "Search",
  listHeader,
  children,
}: AssetSelectorModalProps) => {
  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="px-5">
          <ChainIconRow
            chains={chains}
            selectedChainId={selectedChainId}
            onSelect={onChainSelect}
          />
        </div>

        <div className="px-5 pt-3">
          <div className="flex rounded-xl bg-gray-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pt-3">
          <div className="relative">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            >
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M14 14l3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10"
            />
          </div>
        </div>

        {listHeader && <div className="px-5 pt-3">{listHeader}</div>}

        {/* Fixed height keeps the modal from resizing as lists load. */}
        <div className="mt-3 h-80 overflow-y-auto px-2 pb-3">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default AssetSelectorModal;
