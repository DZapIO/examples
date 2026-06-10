import type { TradeApprovalMode } from "../types/trade";

type ApprovalModeToggleProps = {
  value: TradeApprovalMode;
  onChange: (mode: TradeApprovalMode) => void;
  disabled?: boolean;
};

const OPTIONS: { value: TradeApprovalMode; label: string; description: string }[] =
  [
    {
      value: "default",
      label: "Default",
      description: "ERC-20 approve transaction",
    },
    {
      value: "permit2",
      label: "Permit2",
      description: "Permit2 approve + signature",
    },
  ];

const ApprovalModeToggle = ({
  value,
  onChange,
  disabled = false,
}: ApprovalModeToggleProps) => (
  <fieldset className="mb-4" disabled={disabled}>
    <legend className="text-sm font-medium text-gray-700 mb-2">
      Approval mode
    </legend>
    <div className="grid grid-cols-2 gap-2">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-lg border p-3 text-left transition-colors ${
            value === option.value
              ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <span className="block text-sm font-semibold text-gray-800">
            {option.label}
          </span>
          <span className="block text-xs text-gray-500 mt-1">
            {option.description}
          </span>
        </button>
      ))}
    </div>
  </fieldset>
);

export default ApprovalModeToggle;
