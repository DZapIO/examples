import { useState } from "react";
import { useSwitchChain, useWalletClient } from "wagmi";
import {
  executeGaslessTradeWithGasFallback,
  formatTradeResult,
} from "../../lib/trade";
import type { DZapSigner, TradeParams } from "../../types/trade";
import TradePageLayout from "../TradePageLayout";


// just for example
const DEFAULT_QUOTE_OPTIONS = {
  dexes: { deny: ["relayLink"] as string[] },
};

const Gasless = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const executeTrade = async (params: TradeParams) => {
    setIsLoading(true);
    setStatus("Initializing trade...");

    if (!walletClient) {
      setStatus("Connect your wallet to continue");
      setIsLoading(false);
      return;
    }

    const signer = walletClient as DZapSigner;

    try {
      await switchChainAsync({ chainId: params.fromChain });

      setStatus("Getting quote...");

      const result = await executeGaslessTradeWithGasFallback(
        signer,
        params,
        DEFAULT_QUOTE_OPTIONS
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
      title="DZap Gasless Trade"
      description="Swap or bridge tokens — gasless when the source token supports EIP-2612"
      buttonLabel="Proceed"
      isLoading={isLoading}
      status={status}
      onExecute={executeTrade}
    />
  );
};

export default Gasless;
