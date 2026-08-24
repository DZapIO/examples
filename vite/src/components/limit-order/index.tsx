import { useState } from "react";
import { useSwitchChain, useWalletClient } from "wagmi";
import { useLimitOrderSelection } from "../../hooks/useLimitOrderSelection";
import { useZapQuote } from "../../hooks/useZapQuote";
import {
  executeLimitOrder,
  fetchLimitOrderQuote,
  formatLimitOrderResult,
} from "../../lib/limitOrder";
import type { DZapSigner } from "../../types/zap";
import ZapPageLayout from "../zap/ZapPageLayout";
import ZapQuotePanel from "../zap/ZapQuotePanel";
import LimitOrderForm from "./LimitOrderForm";

const LimitOrder = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [status, setStatus] = useState("");
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const selection = useLimitOrderSelection();
  const {
    prepared,
    loading: quoteLoading,
    error: quoteError,
  } = useZapQuote(selection.limitOrderParams, fetchLimitOrderQuote);

  const handleExecute = async () => {
    if (!prepared || !walletClient || !selection.limitOrderParams) return;

    setIsExecuting(true);
    setStatus("Preparing the order…");

    try {
      // The order is signed against a specific chain's protocol contract, so the
      // wallet has to be on that chain even though nothing is broadcast from it.
      await switchChainAsync({ chainId: selection.chainId });

      // Up to three wallet interactions: a token permit (or an approval, for
      // tokens without EIP-2612), then the order signature. Nothing is broadcast
      // from the wallet — the signed order goes to the backend, which relays it
      // to the venue's orderbook where it rests until a taker fills it.
      setStatus("Signing and submitting the order…");
      const result = await executeLimitOrder(
        walletClient as DZapSigner,
        prepared
      );
      const message = formatLimitOrderResult(result);
      setStatus(message);
      console.log(message);
    } catch (error) {
      console.error("Limit order failed:", error);
      setStatus(
        error instanceof Error
          ? error.message
          : "Limit order failed unexpectedly"
      );
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <ZapPageLayout
      title="DZap Limit Order"
      description="Sign an order to sell one token for another at your price — it rests on the provider's orderbook until a taker fills it"
      buttonLabel={quoteLoading ? "Fetching quote…" : "Sign & place order"}
      isLoading={isExecuting}
      status={quoteError || status}
      isConnected={selection.isConnected}
      canProceed={Boolean(prepared) && !quoteLoading && !isExecuting}
      onExecute={handleExecute}
      quote={prepared ? <ZapQuotePanel quote={prepared.quote} /> : undefined}
    >
      <LimitOrderForm selection={selection} disabled={isExecuting} />
    </ZapPageLayout>
  );
};

export default LimitOrder;
