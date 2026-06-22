import type { ReactNode } from "react";

type SelectorTriggerProps = {
  label: string;
  /** Rendered selection (icon + text) or a muted placeholder. */
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

/** Light form control that opens a selector modal and shows the current pick. */
const SelectorTrigger = ({
  label,
  children,
  onClick,
  disabled,
}: SelectorTriggerProps) => (
  <div className="mb-4">
    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
      {label}
    </span>
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm transition-colors hover:border-gray-300 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:cursor-not-allowed disabled:bg-gray-50"
    >
      <span className="flex min-w-0 items-center gap-2">{children}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="h-4 w-4 shrink-0 text-gray-400"
      >
        <path
          d="M6 8l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  </div>
);

export default SelectorTrigger;
