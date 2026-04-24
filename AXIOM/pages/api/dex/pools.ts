import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import {
  EULER_SWAP_AXUSD_USDC_POOL_ADDRESS,
  EULER_SWAP_AXUSD_AXM_POOL_ADDRESS,
  isEulerSwapDeployed,
} from '../../../src/config/activeContracts.generated';
import { EULER_SWAP } from '../../../shared/contracts';

const ZERO = '0x0000000000000000000000000000000000000000';
const ALCHEMY_RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const EULERSWAP_POOL_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function totalSupply() view returns (uint256)',
  'function fee() view returns (uint256)',
];

interface EulerSwapPoolEntry {
  id: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  poolAddress: string;
  protocol: 'EulerSwap';
  status: string;
  tvl: number;
  tvlNote: string | null;
  reserveA: number;
  reserveB: number;
  feeBps: number;
  swapFeeApyBps: number;
  lendingApyBps: number;
  blendedApyBps: number;
  blendedApyLabel: string;
  erc3643Required: boolean;
}

// tvlMode: 'stable' = both tokens are USD-pegged (sum directly)
//          'axusd-proxy' = one token has no price feed; use the AXUSD side × 2 as a proxy
async function fetchEulerSwapPool(
  poolAddress: string,
  labelA: string,
  labelB: string,
  decimalsA: number,
  decimalsB: number,
  tvlMode: 'stable' | 'axusd-proxy' = 'stable',
): Promise<EulerSwapPoolEntry> {
  const base: EulerSwapPoolEntry = {
    id: `eulerswap_${labelA.toLowerCase()}_${labelB.toLowerCase()}`,
    tokenASymbol: labelA,
    tokenBSymbol: labelB,
    poolAddress,
    protocol: 'EulerSwap',
    status: poolAddress === ZERO ? 'PENDING_DEPLOYMENT' : 'ACTIVE',
    tvl: 0,
    tvlNote: null,
    reserveA: 0,
    reserveB: 0,
    feeBps: EULER_SWAP.SWAP_FEE_BPS,
    swapFeeApyBps: 0,
    lendingApyBps: 0,
    blendedApyBps: 0,
    blendedApyLabel: 'Variable',
    erc3643Required: true,
  };

  if (poolAddress === ZERO) return base;

  try {
    const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC);
    const pool = new ethers.Contract(poolAddress, EULERSWAP_POOL_ABI, provider);
    const reserves = await pool.getReserves();

    let feeBps = EULER_SWAP.SWAP_FEE_BPS;
    try { feeBps = Number(await pool.fee()); } catch {}

    const r0 = Number(ethers.formatUnits(reserves[0], decimalsA));
    const r1 = Number(ethers.formatUnits(reserves[1], decimalsB));

    let tvl: number;
    let tvlNote: string | null = null;

    if (tvlMode === 'axusd-proxy') {
      // AXM has no external price oracle — use AXUSD reserve × 2 as a balanced-pool proxy.
      // Pool ordering: token0=AXM (r0), token1=AXUSD (r1, USD-pegged)
      tvl = r1 * 2;
      tvlNote = 'Estimated — AXUSD reserve × 2 proxy (no AXM market price)';
    } else {
      // Both tokens are USD-pegged; sum directly
      tvl = r0 + r1;
    }

    // Swap fee APY requires real on-chain volume data — not available for new pools.
    // Set to 0 until volume history exists; label as Variable.
    const swapFeeApyBps = 0;

    return { ...base, tvl, tvlNote, reserveA: r0, reserveB: r1, feeBps, swapFeeApyBps, blendedApyBps: 0, blendedApyLabel: 'Variable', status: 'ACTIVE' };
  } catch {
    return base;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userAddress = req.query.userAddress as string | undefined;

  try {
    const [eulerSwapUsdcPool, eulerSwapAxmPool] = await Promise.all([
      fetchEulerSwapPool(EULER_SWAP_AXUSD_USDC_POOL_ADDRESS, 'USDC', 'AXUSD', 6, 18, 'stable'),
      fetchEulerSwapPool(EULER_SWAP_AXUSD_AXM_POOL_ADDRESS, 'AXM', 'AXUSD', 18, 18, 'axusd-proxy'),
    ]);

    const eulerSwapPools = [eulerSwapUsdcPool, eulerSwapAxmPool];

    return res.status(200).json({
      pools: {
        eulerSwap: eulerSwapPools,
      },
      primaryVenue: 'EulerSwap',
      count: eulerSwapPools.length,
      source: 'eulerswap',
      message: `${eulerSwapPools.length} EulerSwap pool(s)`,
    });
  } catch (error) {
    console.error('[dex/pools] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch pools' });
  }
}
