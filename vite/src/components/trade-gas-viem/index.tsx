import { useState } from "react";
import { useSwitchChain, useWalletClient } from "wagmi";
import {
  executeGasTrade,
  formatTradeResult,
  type PreparedTrade,
} from "../../lib/trade";
import type {
  DZapSigner,
  TradeApprovalMode,
  TradeParams,
} from "../../types/trade";
import ApprovalModeToggle from "../ApprovalModeToggle";
import TradePageLayout from "../TradePageLayout";

const TradeGasViem = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [approvalMode, setApprovalMode] = useState<TradeApprovalMode>("default");
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const executeTrade = async (params: TradeParams, prepared: PreparedTrade) => {
    setIsLoading(true);
    setStatus("Confirming trade...");

    if (!walletClient) {
      setStatus("Connect your wallet to continue");
      setIsLoading(false);
      return;
    }

    const signer = walletClient as DZapSigner;

    try {
      await switchChainAsync({ chainId: params.fromChain });

      const result = await executeGasTrade(
        signer,
        params,
        prepared,
        approvalMode
      );
      const message = formatTradeResult(result);

      if (result.status === "success") {
        console.log(message);
      } else {
        console.error(message);
      }
      setStatus(message);
    } catch (error) {
      console.error("Trade failed:", error);
      setStatus(
        error instanceof Error ? error.message : "Trade failed unexpectedly"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TradePageLayout
      title="DZap Trade Gas (Viem)"
      description="Swap or bridge tokens using a viem wallet client via wagmi"
      buttonLabel="Confirm trade"
      isLoading={isLoading}
      status={status}
      onExecute={executeTrade}
      extraControls={
        <ApprovalModeToggle
          value={approvalMode}
          onChange={setApprovalMode}
          disabled={isLoading}
        />
      }
    />
  );
};

export default TradeGasViem;
