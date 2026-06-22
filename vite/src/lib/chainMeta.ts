/** Brand color per supported chain, used for chain badges and dots. */
export const CHAIN_COLORS: Record<number, string> = {
  8453: "#0052FF", // Base
  137: "#8247E5", // Polygon
  10: "#FF0420", // Optimism
  42161: "#12AAFF", // Arbitrum
  1: "#627EEA", // Ethereum
};

export const getChainColor = (chainId: number): string =>
  CHAIN_COLORS[chainId] ?? "#6B7280";

/** Chain logos (DefiLlama CDN); the Avatar monogram covers any load failure. */
export const CHAIN_LOGOS: Record<number, string> = {
  1: "https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg",
  8453: "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/base.svg",
  137: "https://icons.llamao.fi/icons/chains/rsz_polygon.jpg",
  10: "https://icons.llamao.fi/icons/chains/rsz_optimism.jpg",
  42161: "https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg",
};

export const getChainLogo = (chainId: number): string | undefined =>
  CHAIN_LOGOS[chainId];
