import type {
  HexString,
  ZapPool,
  ZapPosition,
  ZapRouteRequestPoolDetails,
} from "@dzapio/sdk";
import type { ZapProtocol } from "../types/zap";
import { dZap } from "./client";

/** Page size used when listing pools for a protocol. */
const POOLS_PAGE_SIZE = 50;

/** How many tick-spacings wide the default concentrated-liquidity range is. */
const DEFAULT_RANGE_SPACINGS = 50;

/**
 * Protocols (providers) that support zaps on a given chain.
 * Combines the chain → provider-id map with the provider details registry.
 */
export async function fetchZapProtocols(
  chainId: number
): Promise<ZapProtocol[]> {
  const [chains, providers] = await Promise.all([
    dZap.getZapChains(),
    dZap.getZapProviders(),
  ]);

  const supportedIds = chains[String(chainId)]?.supportedProviders ?? [];
  return supportedIds
    .map((providerId) => providers[providerId])
    .filter((provider): provider is ZapProtocol => Boolean(provider));
}

/** Pools offered by a protocol on a chain (TVL/APR carried on each pool). */
export async function fetchZapPools(
  chainId: number,
  provider: string
): Promise<ZapPool[]> {
  const response = await dZap.getZapPools({
    chainId,
    provider,
    limit: POOLS_PAGE_SIZE,
    offset: 0,
  });
  return response.pools;
}

/** The connected account's open positions in a protocol on a chain. */
export async function fetchZapPositions(
  account: HexString,
  chainId: number,
  provider: string
): Promise<ZapPosition[]> {
  const response = await dZap.getZapPositions({ account, chainId, provider });
  return response.positions;
}

/**
 * Derive a default tick range for a concentrated-liquidity pool, centered on
 * the current tick. Returns `undefined` for pools without a `slot0` (e.g.
 * full-range / non-CL pools), where the router picks the range itself.
 */
export async function derivePoolTickRange(
  pool: ZapPool
): Promise<ZapRouteRequestPoolDetails | undefined> {
  try {
    const { slot0 } = await dZap.getZapPoolDetails({
      address: pool.address as HexString,
      chainId: pool.chainId,
      provider: pool.provider,
    });

    if (!slot0?.tickSpacing) {
      return undefined;
    }

    const { tick, tickSpacing } = slot0;
    const aligned = Math.floor(tick / tickSpacing) * tickSpacing;
    const halfWidth = tickSpacing * DEFAULT_RANGE_SPACINGS;

    return { lowerTick: aligned - halfWidth, upperTick: aligned + halfWidth };
  } catch {
    return undefined;
  }
}
