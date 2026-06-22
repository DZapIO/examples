import { ethers } from "ethers";
import { useState } from "react";
import { useSwitchChain } from "wagmi";
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

const TradeGasEthers = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [approvalMode, setApprovalMode] = useState<TradeApprovalMode>("default");
  const { switchChainAsync } = useSwitchChain();

  const executeTrade = async (params: TradeParams, prepared: PreparedTrade) => {
    setIsLoading(true);
    setStatus("Confirming trade...");

    if (!window.ethereum) {
      setStatus("No wallet detected — install MetaMask or another Web3 wallet");
      setIsLoading(false);
      return;
    }

    try {
      await switchChainAsync({ chainId: params.fromChain });

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const ethersSigner = provider.getSigner();
      const signer = ethersSigner as DZapSigner;

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
      title="DZap Trade Gas (Ethers)"
      description="Swap or bridge tokens using an ethers Signer — viem is recommended for new integrations"
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

export default TradeGasEthers;
