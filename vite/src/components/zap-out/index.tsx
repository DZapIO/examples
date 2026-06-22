import { useState } from "react";
import { useSwitchChain, useWalletClient } from "wagmi";
import { useZapOutSelection } from "../../hooks/useZapOutSelection";
import { useZapQuote } from "../../hooks/useZapQuote";
import { executeZap, formatZapResult, prepareZapOut } from "../../lib/zap";
import type { DZapSigner } from "../../types/zap";
import ZapOutForm from "../zap/ZapOutForm";
import ZapPageLayout from "../zap/ZapPageLayout";
import ZapQuotePanel from "../zap/ZapQuotePanel";

const ZapOut = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [status, setStatus] = useState("");
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const selection = useZapOutSelection();
  const {
    prepared,
    loading: quoteLoading,
    error: quoteError,
  } = useZapQuote(selection.zapOutParams, prepareZapOut);

  const handleExecute = async () => {
    if (!prepared || !walletClient) return;

    setIsExecuting(true);
    setStatus("Confirming zap...");

    try {
      // Approvals and the Permit2 signature happen on the position's chain.
      await switchChainAsync({ chainId: prepared.request.srcChainId });

      const result = await executeZap(
        walletClient as DZapSigner,
        prepared.request
      );
      const message = formatZapResult(result);
      setStatus(message);
      console.log(message);
    } catch (error) {
      console.error("Zap out failed:", error);
      setStatus(
        error instanceof Error ? error.message : "Zap out failed unexpectedly"
      );
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <ZapPageLayout
      title="DZap Zap Out"
      description="Withdraw a protocol position into any token on any chain"
      buttonLabel={quoteLoading ? "Fetching quote…" : "Confirm zap out"}
      isLoading={isExecuting}
      status={quoteError || status}
      isConnected={selection.isConnected}
      canProceed={Boolean(prepared) && !quoteLoading && !isExecuting}
      onExecute={handleExecute}
      quote={prepared ? <ZapQuotePanel quote={prepared.quote} /> : undefined}
    >
      <ZapOutForm selection={selection} disabled={isExecuting} />
    </ZapPageLayout>
  );
};

export default ZapOut;
