import type { NextApiRequest, NextApiResponse } from 'next';
import camelotPoolService from '../../../lib/services/CamelotPoolService';
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

const POOL_ABI = ['function getReserves() view returns (uint256 reserve0, uint256 reserve1)'];

async function fetchEulerSwapTvl(poolAddress: string): Promise<number> {
  if (poolAddress === ZERO) return 0;
  try {
    const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC);
    const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);
    const reserves = await pool.getReserves();
    const r0 = Number(ethers.formatUnits(reserves[0], 6));
    const r1 = Number(ethers.formatUnits(reserves[1], 6));
    return r0 + r1;
  } catch {
    return 0;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [camelotData, eulerSwapUsdcTvl, eulerSwapAxmTvl] = await Promise.all([
      camelotPoolService.getAllPools().catch(() => []),
      fetchEulerSwapTvl(EULER_SWAP_AXUSD_USDC_POOL_ADDRESS),
      fetchEulerSwapTvl(EULER_SWAP_AXUSD_AXM_POOL_ADDRESS),
    ]);

    const camelotTVL      = camelotData.reduce((s, p) => s + p.tvl, 0);
    const camelotVolume24h = camelotData.reduce((s, p) => s + p.volume24h, 0);
    const camelotFees24h   = camelotData.reduce((s, p) => s + p.fees24h, 0);

    const eulerSwapTVL = eulerSwapUsdcTvl + eulerSwapAxmTvl;
    const feeBps = EULER_SWAP.SWAP_FEE_BPS;
    const eulerSwapEstVolume24h = eulerSwapTVL * 0.15;
    const eulerSwapFees24h      = eulerSwapEstVolume24h * (feeBps / 10000);

    const totalTVL      = camelotTVL + eulerSwapTVL;
    const totalVolume24h = camelotVolume24h + eulerSwapEstVolume24h;
    const totalFees24h   = camelotFees24h + eulerSwapFees24h;
    const totalPools     = camelotData.length + (isEulerSwapDeployed() ? 2 : 0);

    return res.status(200).json({
      totalPools,
      totalTVL: totalTVL.toFixed(2),
      totalVolume24h: totalVolume24h.toFixed(2),
      totalFees24h: totalFees24h.toFixed(2),
      primaryVenue: isEulerSwapDeployed() ? 'EulerSwap' : 'Camelot',
      breakdown: {
        eulerSwap: {
          tvl: eulerSwapTVL.toFixed(2),
          estimatedVolume24h: eulerSwapEstVolume24h.toFixed(2),
          estimatedFees24h: eulerSwapFees24h.toFixed(2),
          pools: isEulerSwapDeployed() ? 2 : 0,
          status: isEulerSwapDeployed() ? 'LIVE' : 'PENDING_DEPLOYMENT',
        },
        camelot: {
          tvl: camelotTVL.toFixed(2),
          volume24h: camelotVolume24h.toFixed(2),
          fees24h: camelotFees24h.toFixed(2),
          pools: camelotData.length,
          status: 'LIVE',
          note: 'Retained as fallback venue',
        },
      },
      source: isEulerSwapDeployed() ? 'eulerswap+camelot' : 'camelot',
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
