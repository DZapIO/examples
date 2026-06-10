import { DZapClient } from "@dzapio/sdk";

export const dZap = DZapClient.getInstance(import.meta.env.VITE_DZAP_API_KEY);
