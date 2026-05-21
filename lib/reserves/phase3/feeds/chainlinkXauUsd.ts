/**
 * lib/reserves/phase3/feeds/chainlinkXauUsd.ts
 *
 * Phase 4 — Chainlink XAU/USD live feed fetcher (Arbitrum One)
 *
 * Reads latestRoundData() from the Chainlink AggregatorV3Interface at the
 * canonical Arbitrum One XAU/USD proxy address. Returns the spot gold price
 * in USD (8 decimals on-chain, normalized to float).
 *
 * Ref: https://data.chain.link/arbitrum/mainnet/commodities/xau-usd
 */

import { ethers } from 'ethers';

// Chainlink AggregatorV3Interface (minimal ABI)
const AGGREGATOR_V3_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
  'function description() external view returns (string)',
];

// Canonical Chainlink XAU/USD proxy on Arbitrum One
// https://docs.chain.link/data-feeds/price-feeds/addresses?network=arbitrum
export const CHAINLINK_XAU_USD_ADDRESS = '0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c';

// Max age before a Chainlink round is considered stale (3600s = 1 hr heartbeat)
const MAX_ROUND_AGE_SECONDS = 3600;

export interface ChainlinkRoundData {
  price: number;          // XAU/USD in USD (normalized float)
  updatedAt: Date;
  roundId: string;
  decimals: number;
  description: string;
}

function getArbitrumRpcUrl(): string {
  const key = process.env.ALCHEMY_API_KEY;
  if (key) return `https://arb-mainnet.g.alchemy.com/v2/${key}`;
  return 'https://arb1.arbitrum.io/rpc';
}

/**
 * Fetches the latest XAU/USD round from Chainlink on Arbitrum One.
 * Returns null on any error or if the round is stale.
 */
export async function fetchChainlinkXauUsd(): Promise<ChainlinkRoundData | null> {
  const rpcUrl = getArbitrumRpcUrl();

  let provider: ethers.JsonRpcProvider | null = null;
  try {
    provider = new ethers.JsonRpcProvider(rpcUrl, 42161, { staticNetwork: true });
    const contract = new ethers.Contract(CHAINLINK_XAU_USD_ADDRESS, AGGREGATOR_V3_ABI, provider);

    const [roundId, answer, , updatedAt] = await Promise.race([
      contract.latestRoundData() as Promise<[bigint, bigint, bigint, bigint, bigint]>,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Chainlink RPC timeout')), 8_000)
      ),
    ]);

    const updatedAtMs = Number(updatedAt) * 1000;
    const ageSeconds = (Date.now() - updatedAtMs) / 1000;

    if (ageSeconds > MAX_ROUND_AGE_SECONDS) {
      console.warn(`[ChainlinkXauUsd] Round stale: age ${Math.round(ageSeconds)}s > ${MAX_ROUND_AGE_SECONDS}s`);
      // Still return data — caller decides freshness
    }

    const decimals = 8; // Chainlink commodity feeds always use 8 decimals
    const price = Number(answer) / Math.pow(10, decimals);

    if (price <= 0 || !isFinite(price)) {
      console.error('[ChainlinkXauUsd] Invalid price returned:', answer.toString());
      return null;
    }

    return {
      price,
      updatedAt: new Date(updatedAtMs),
      roundId: roundId.toString(),
      decimals,
      description: 'XAU / USD',
    };
  } catch (err) {
    console.error('[ChainlinkXauUsd] Fetch failed:', (err as Error).message);
    return null;
  } finally {
    provider?.destroy?.();
  }
}
