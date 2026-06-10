import { useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { DEFAULT_CHAIN, isSupportedChain } from "../lib/chains";

/** Switches the wallet to Base when connected on an unsupported chain. */
export function useEnforceSupportedChain() {
  const { isConnected, chainId } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();

  useEffect(() => {
    if (!isConnected || !chainId || isSupportedChain(chainId)) {
      return;
    }

    switchChainAsync({ chainId: DEFAULT_CHAIN.id }).catch(console.error);
  }, [isConnected, chainId, switchChainAsync]);

  return { isSwitchingChain: isPending };
}
