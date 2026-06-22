import { useState } from "react";
import { useSwitchChain, useWalletClient } from "wagmi";
import { useZapInSelection } from "../../hooks/useZapInSelection";
import { useZapQuote } from "../../hooks/useZapQuote";
import { executeZap, formatZapResult, fetchZapInQuote } from "../../lib/zap";
import type { DZapSigner } from "../../types/zap";
import ZapInForm from "../zap/ZapInForm";
import ZapPageLayout from "../zap/ZapPageLayout";
import ZapQuotePanel from "../zap/ZapQuotePanel";

const ZapIn = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [status, setStatus] = useState("");
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const selection = useZapInSelection();
  const {
    prepared,
    loading: quoteLoading,
    error: quoteError,
  } = useZapQuote(selection.zapInParams, fetchZapInQuote);

  const handleExecute = async () => {
    if (!prepared || !walletClient) return;

    setIsExecuting(true);
    setStatus("Confirming zap...");

    try {
      // Approvals and the Permit2 signature happen on the source chain.
      await switchChainAsync({ chainId: prepared.request.srcChainId });

      const result = await executeZap(
        walletClient as DZapSigner,
        prepared.request
      );
      const message = formatZapResult(result);
      setStatus(message);
      console.log(message);
    } catch (error) {
      console.error("Zap in failed:", error);
      setStatus(
        error instanceof Error ? error.message : "Zap in failed unexpectedly"
      );
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <ZapPageLayout
      title="DZap Zap In"
      description="Deposit any token into a pool on any protocol in one transaction"
      buttonLabel={quoteLoading ? "Fetching quote…" : "Confirm zap in"}
      isLoading={isExecuting}
      status={quoteError || status}
      isConnected={selection.isConnected}
      canProceed={Boolean(prepared) && !quoteLoading && !isExecuting}
      onExecute={handleExecute}
      quote={prepared ? <ZapQuotePanel quote={prepared.quote} /> : undefined}
    >
      <ZapInForm selection={selection} disabled={isExecuting} />
    </ZapPageLayout>
  );
};

export default ZapIn;
