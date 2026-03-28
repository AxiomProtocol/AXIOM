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
  'function getReserves() view returns (uint256 reserve0, uint256 reserve1)',
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
  feeBps: number;
  swapFeeApyBps: number;
  lendingApyBps: number;
  blendedApyBps: number;
  blendedApyLabel: string;
  erc3643Required: boolean;
}

async function fetchEulerSwapPool(
  poolAddress: string,
  labelA: string,
  labelB: string,
  decimalsA: number,
  decimalsB: number,
): Promise<EulerSwapPoolEntry> {
  const base: EulerSwapPoolEntry = {
    id: `eulerswap_${labelA.toLowerCase()}_${labelB.toLowerCase()}`,
    tokenASymbol: labelA,
    tokenBSymbol: labelB,
    poolAddress,
    protocol: 'EulerSwap',
    status: poolAddress === ZERO ? 'PENDING_DEPLOYMENT' : 'ACTIVE',
    tvl: 0,
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
    const [reserves] = await Promise.all([pool.getReserves()]);

    let feeBps = EULER_SWAP.SWAP_FEE_BPS;
    try { feeBps = Number(await pool.fee()); } catch {}

    const r0 = Number(ethers.formatUnits(reserves[0], decimalsA));
    const r1 = Number(ethers.formatUnits(reserves[1], decimalsB));
    const tvl = r0 + r1;
    const estimatedDailyVol = tvl * 0.15;
    const swapFeeApyBps = tvl > 0 ? Math.round((estimatedDailyVol * (feeBps / 10000) * 365 / tvl) * 10000) : 0;

    return { ...base, tvl, feeBps, swapFeeApyBps, blendedApyBps: swapFeeApyBps, status: 'ACTIVE' };
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
      fetchEulerSwapPool(EULER_SWAP_AXUSD_USDC_POOL_ADDRESS, 'AXUSD', 'USDC', 6, 6),
      fetchEulerSwapPool(EULER_SWAP_AXUSD_AXM_POOL_ADDRESS, 'AXM', 'AXUSD', 18, 18),
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
