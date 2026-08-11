import { useState } from "react";
import { useSwitchChain, useWalletClient } from "wagmi";
import { useBorrowSelection } from "../../hooks/useBorrowSelection";
import { useZapQuote } from "../../hooks/useZapQuote";
import { executeBorrow, fetchBorrowQuote, formatBorrowResult } from "../../lib/borrow";
import type { DZapSigner } from "../../types/zap";
import ZapPageLayout from "../zap/ZapPageLayout";
import ZapQuotePanel from "../zap/ZapQuotePanel";
import BorrowForm from "./BorrowForm";

const Borrow = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [status, setStatus] = useState("");
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const selection = useBorrowSelection();
  const {
    prepared,
    loading: quoteLoading,
    error: quoteError,
  } = useZapQuote(selection.borrowParams, fetchBorrowQuote);

  const handleExecute = async () => {
    if (!prepared || !walletClient || !selection.borrowParams) return;

    setIsExecuting(true);
    setStatus("Confirming borrow...");

    try {
      await switchChainAsync({ chainId: selection.chainId });

      // executeBorrow ensures Permit2 allowance for the collateral position,
      // then (if the quote came back with preExecutionSteps, e.g. Aave's
      // DelegationWithSig) prompts that signature before building the bundle.
      const result = await executeBorrow(
        walletClient as DZapSigner,
        selection.borrowParams,
        prepared
      );
      const message = formatBorrowResult(result);
      setStatus(message);
      console.log(message);
    } catch (error) {
      console.error("Borrow failed:", error);
      setStatus(
        error instanceof Error ? error.message : "Borrow failed unexpectedly"
      );
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <ZapPageLayout
      title="DZap Borrow"
      description="Withdraw a lending collateral position and borrow another asset against it, via the bundle API"
      buttonLabel={quoteLoading ? "Fetching quote…" : "Confirm borrow"}
      isLoading={isExecuting}
      status={quoteError || status}
      isConnected={selection.isConnected}
      canProceed={Boolean(prepared) && !quoteLoading && !isExecuting}
      onExecute={handleExecute}
      quote={prepared ? <ZapQuotePanel quote={prepared.quote} /> : undefined}
    >
      <BorrowForm selection={selection} disabled={isExecuting} />
    </ZapPageLayout>
  );
};

export default Borrow;
