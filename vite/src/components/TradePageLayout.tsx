import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { ReactNode } from "react";
import { useEnforceSupportedChain } from "../hooks/useEnforceSupportedChain";
import { useTradeQuote } from "../hooks/useTradeQuote";
import { useTradeSelection } from "../hooks/useTradeSelection";
import type { PreparedTrade } from "../lib/trade";
import type { TradeParams, TradeQuoteOptions } from "../types/trade";
import TradeForm from "./TradeForm";
import TradeQuotePanel from "./TradeQuotePanel";

type TradePageLayoutProps = {
  title: string;
  description: ReactNode;
  buttonLabel: string;
  isLoading: boolean;
  status: string;
  /** Optional quote filters (e.g. the gasless page denies certain DEXes). */
  quoteOptions?: TradeQuoteOptions;
  onExecute: (params: TradeParams, prepared: PreparedTrade) => void;
  extraControls?: ReactNode;
};

const TradePageLayout = ({
  title,
  description,
  buttonLabel,
  isLoading,
  status,
  quoteOptions,
  onExecute,
  extraControls,
}: TradePageLayoutProps) => {
  const { isSwitchingChain } = useEnforceSupportedChain();
  const selection = useTradeSelection();
  const {
    prepared,
    loading: quoteLoading,
    error: quoteError,
  } = useTradeQuote(selection.tradeParams, quoteOptions);

  const canProceed =
    selection.isConnected &&
    Boolean(prepared) &&
    !quoteLoading &&
    !isLoading &&
    !isSwitchingChain;

  return (
    <>
      <div className="flex items-center justify-center bg-gray-100 py-4">
        <ConnectButton />
      </div>

      <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">{title}</h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">{description}</p>
        </div>

        {!selection.isConnected ? (
          <div className="mb-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-600">
              Connect your wallet to select tokens and trade.
            </p>
          </div>
        ) : (
          <>
            {isSwitchingChain && (
              <p className="mb-4 text-sm text-gray-500">Switching to Base...</p>
            )}

            <TradeForm
              selection={selection}
              disabled={isLoading || isSwitchingChain}
            />

            {extraControls}

            {prepared && <TradeQuotePanel quote={prepared.quote} />}
          </>
        )}

        <button
          type="button"
          onClick={() => {
            if (selection.tradeParams && prepared) {
              onExecute(selection.tradeParams, prepared);
            }
          }}
          disabled={!canProceed}
          className={`w-full mt-4 py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
            canProceed
              ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {isLoading
            ? "Processing..."
            : quoteLoading
              ? "Fetching quote…"
              : buttonLabel}
        </button>

        {(quoteError || status) && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50 border">
            <p className="text-sm text-gray-700 break-words">
              {quoteError || status}
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default TradePageLayout;
