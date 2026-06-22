import { DZapClient } from "@dzapio/sdk";
import { mainnet } from "viem/chains";

export const dZap = DZapClient.getInstance(import.meta.env.VITE_DZAP_API_KEY, {
  [mainnet.id]: ["https://eth.drpc.org"],
});
