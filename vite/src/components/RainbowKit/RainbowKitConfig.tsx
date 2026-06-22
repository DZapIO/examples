import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { mainnet } from "viem/chains";
import { createConfig, http } from "wagmi";
import { SUPPORTED_CHAINS } from "../../lib/chains";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, coinbaseWallet, injectedWallet],
    },
  ],
  {
    appName: import.meta.env.VITE_APP_NAME,
    projectId: "random", // Every dApp that relies on WalletConnect now needs to obtain a projectId from WalletConnect Cloud. This is absolutely free and only takes a few minutes.
  }
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [...SUPPORTED_CHAINS],
  transports: SUPPORTED_CHAINS.reduce((acc, chain) => {
    if (chain.id === mainnet.id) {
      acc[chain.id] = http("https://eth.drpc.org");
      return acc;
    }
    acc[chain.id] = http();
    return acc;
  }, {} as Record<number, ReturnType<typeof http>>),
  ssr: false,
});
