import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { ReactNode } from "react";
import { useEnforceSupportedChain } from "../../hooks/useEnforceSupportedChain";

type ZapPageLayoutProps = {
  title: string;
  description: ReactNode;
  buttonLabel: string;
  isLoading: boolean;
  status: string;
  isConnected: boolean;
  canProceed: boolean;
  onExecute: () => void;
  /** Quote preview shown between the form and the confirm button. */
  quote?: ReactNode;
  children: ReactNode;
};

/**
 * Shared chrome for the Zap pages: wallet connect, title/description, the
 * selection form (`children`), the proceed button, and a status line.
 */
const ZapPageLayout = ({
  title,
  description,
  buttonLabel,
  isLoading,
  status,
  isConnected,
  canProceed,
  onExecute,
  quote,
  children,
}: ZapPageLayoutProps) => {
  useEnforceSupportedChain();

  return (
    <>
      <div className="flex items-center justify-center bg-gray-100 py-4">
        <ConnectButton />
      </div>

      <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">{title}</h2>
        <p className="text-sm text-gray-600 mb-4">{description}</p>

        {!isConnected ? (
          <div className="mb-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-600">
              Connect your wallet to select tokens and zap.
            </p>
          </div>
        ) : (
          children
        )}

        {isConnected && quote}

        <button
          type="button"
          onClick={onExecute}
          disabled={!canProceed}
          className={`w-full mt-4 py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
            canProceed
              ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {isLoading ? "Processing..." : buttonLabel}
        </button>

        {status && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50 border">
            <p className="text-sm text-gray-700 break-words">{status}</p>
          </div>
        )}
      </div>
    </>
  );
};

export default ZapPageLayout;
