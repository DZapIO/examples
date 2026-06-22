import type { ReactNode } from "react";

type RowProps = {
  leading: ReactNode;
  title: string;
  titleBadge?: ReactNode;
  subtitle?: string;
  trailingTop?: string;
  trailingBottom?: string;
  selected?: boolean;
  onClick: () => void;
};

/** A single result row in the selector list (token, pool, or position). */
const Row = ({
  leading,
  title,
  titleBadge,
  subtitle,
  trailingTop,
  trailingBottom,
  selected,
  onClick,
}: RowProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
      selected ? "bg-blue-50" : "hover:bg-gray-50"
    }`}
  >
    {leading}
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-semibold text-gray-900">
          {title}
        </span>
        {titleBadge}
      </div>
      {subtitle && <p className="truncate text-xs text-gray-500">{subtitle}</p>}
    </div>
    {(trailingTop || trailingBottom) && (
      <div className="shrink-0 text-right">
        {trailingTop && (
          <p className="text-sm font-medium text-gray-900">{trailingTop}</p>
        )}
        {trailingBottom && (
          <p className="text-xs text-gray-500">{trailingBottom}</p>
        )}
      </div>
    )}
  </button>
);

export default Row;
