import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { ReactNode } from "react";
import { useEnforceSupportedChain } from "../hooks/useEnforceSupportedChain";
import TradeForm from "./TradeForm";
import { useTradeSelection } from "../hooks/useTradeSelection";

type TradePageLayoutProps = {
  title: string;
  description: ReactNode;
  buttonLabel: string;
  isLoading: boolean;
  status: string;
  onExecute: (tradeParams: NonNullable<
    ReturnType<typeof useTradeSelection>["tradeParams"]
  >) => void;
  extraControls?: ReactNode;
};

const TradePageLayout = ({
  title,
  description,
  buttonLabel,
  isLoading,
  status,
  onExecute,
  extraControls,
}: TradePageLayoutProps) => {
  const { isSwitchingChain } = useEnforceSupportedChain();
  const selection = useTradeSelection();

  const canProceed =
    selection.isConnected &&
    selection.isFormComplete &&
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
              sourceChainId={selection.sourceChainId}
              destChainId={selection.destChainId}
              balanceTokens={selection.balanceTokens}
              destTokens={selection.destTokens}
              loadingBalances={selection.loadingBalances}
              loadingDestTokens={selection.loadingDestTokens}
              fetchError={selection.fetchError}
              srcTokenAddress={selection.srcTokenAddress}
              destTokenAddress={selection.destTokenAddress}
              onSrcTokenChange={selection.setSrcTokenAddress}
              onDestTokenChange={selection.setDestTokenAddress}
              onSourceChainChange={selection.handleSourceChainChange}
              onDestChainChange={selection.handleDestChainChange}
              amountPreset={selection.amountPreset}
              onAmountPresetChange={selection.setAmountPreset}
              customAmount={selection.customAmount}
              onCustomAmountChange={selection.setCustomAmount}
              amountError={selection.amountError}
              formattedBalance={selection.formattedBalance}
              selectedSrcToken={selection.selectedSrcToken}
              disabled={isLoading || isSwitchingChain}
            />

            {extraControls}
          </>
        )}

        <button
          type="button"
          onClick={() => {
            if (selection.tradeParams) {
              onExecute(selection.tradeParams);
            }
          }}
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

export default TradePageLayout;
