import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import App from "./App.js";
import { wagmiConfig } from "./components/RainbowKit/RainbowKitConfig.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { Theme } from "@radix-ui/themes";

import "@rainbow-me/rainbowkit/styles.css";
import "@radix-ui/themes/styles.css";
import "./index.css";
import { base } from "viem/chains";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()} initialChain={base}>
          <Theme>
            <App />
          </Theme>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
