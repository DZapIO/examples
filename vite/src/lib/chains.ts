import { arbitrum, base, optimism, polygon } from "viem/chains";

export const SUPPORTED_CHAINS = [base, polygon, optimism, arbitrum] as const;

export const SUPPORTED_CHAIN_IDS: number[] = SUPPORTED_CHAINS.map((chain) => chain.id);

export const DEFAULT_CHAIN = base;

export function isSupportedChain(chainId: number): boolean {
  return SUPPORTED_CHAIN_IDS.includes(chainId);
}

export function getChainName(chainId: number): string {
  return (
    SUPPORTED_CHAINS.find((chain) => chain.id === chainId)?.name ?? "Unknown"
  );
}
