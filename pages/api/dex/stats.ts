import type { NextApiRequest, NextApiResponse } from 'next';
import {
  EULER_SWAP_AXUSD_USDC_POOL_ADDRESS,
  EULER_SWAP_AXUSD_AXM_POOL_ADDRESS,
  isEulerSwapDeployed,
} from '../../../src/config/activeContracts.generated';
import { ethers } from 'ethers';
import { EULER_SWAP } from '../../../shared/contracts';

const ZERO = '0x0000000000000000000000000000000000000000';
const ALCHEMY_RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const POOL_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
];

// poolType: 'stable' for USDC/AXUSD (USDC=6 dec, AXUSD=18 dec);
//           'axm'    for AXM/AXUSD  (AXM=18 dec token0, AXUSD=18 dec token1 — use AXUSD reserve × 2 proxy)
async function fetchEulerSwapTvl(poolAddress: string, poolType: 'stable' | 'axm'): Promise<number> {
  if (poolAddress === ZERO) return 0;
  try {
    const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC);
    const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);
    const reserves = await pool.getReserves();

    if (poolType === 'stable') {
      // token0=USDC (6 dec), token1=AXUSD (18 dec)
      const usdcAmt  = Number(ethers.formatUnits(reserves[0], 6));
      const axusdAmt = Number(ethers.formatUnits(reserves[1], 18));
      return usdcAmt + axusdAmt;
    }

    // AXM pool: token0=AXM (18 dec), token1=AXUSD (18 dec)
    // No reliable AXM/USD price feed yet — use AXUSD reserve × 2 as a balanced-pool proxy
    const axusdAmt = Number(ethers.formatUnits(reserves[1], 18));
    return axusdAmt * 2;
  } catch {
    return 0;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [eulerSwapUsdcTvl, eulerSwapAxmTvl] = await Promise.all([
      fetchEulerSwapTvl(EULER_SWAP_AXUSD_USDC_POOL_ADDRESS, 'stable'),
      fetchEulerSwapTvl(EULER_SWAP_AXUSD_AXM_POOL_ADDRESS, 'axm'),
    ]);

    const eulerSwapTVL = eulerSwapUsdcTvl + eulerSwapAxmTvl;
    const totalPools = isEulerSwapDeployed() ? 2 : 0;

    // Volume and fees are not estimated — they require on-chain swap event indexing.
    // Pools are newly deployed with no trade history. Show 0 until real data exists.
    return res.status(200).json({
      totalPools,
      totalTVL: eulerSwapTVL.toFixed(2),
      totalVolume24h: '0.00',
      totalFees24h: '0.00',
      volumeNote: 'On-chain swap indexing not yet available — no trade history',
      primaryVenue: 'EulerSwap',
      breakdown: {
        eulerSwap: {
          tvl: eulerSwapTVL.toFixed(2),
          volume24h: '0.00',
          fees24h: '0.00',
          pools: totalPools,
          status: isEulerSwapDeployed() ? 'LIVE' : 'PENDING_DEPLOYMENT',
        },
      },
      source: 'eulerswap',
    });
  } catch (error) {
    console.error('[dex/stats] Error:', error);
    return res.status(500).json({
      totalPools: 0,
      totalTVL: '0',
      totalVolume24h: '0',
      totalFees24h: '0',
      error: 'Failed to fetch stats',
    });
  }
}
