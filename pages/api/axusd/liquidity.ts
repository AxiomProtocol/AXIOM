import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { AXUSD_GENIUS_CONTRACTS, STABLECOINS } from '../../../shared/contracts';
import {
  EULER_SWAP_AXUSD_USDC_POOL_ADDRESS,
  isEulerSwapDeployed,
} from '../../../src/config/activeContracts.generated';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const ZERO = '0x0000000000000000000000000000000000000000';

const EULERSWAP_POOL_ABI = [
  'function getReserves() view returns (uint256 reserve0, uint256 reserve1)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function totalSupply() view returns (uint256)',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const eulerSwapDeployed = isEulerSwapDeployed();

    const eulerSwapLiquidity = await fetchEulerSwapLiquidity(provider, eulerSwapDeployed);

    res.status(200).json({
      success: true,
      data: {
        primaryVenue: 'EulerSwap',
        totalValueUsd: eulerSwapLiquidity.totalValueUsd.toFixed(2),
        eulerSwap: eulerSwapLiquidity,
        primary: eulerSwapLiquidity,
        contracts: {
          eulerSwapPool: EULER_SWAP_AXUSD_USDC_POOL_ADDRESS,
          axusd: AXUSD_GENIUS_CONTRACTS.AXUSD,
          usdc: STABLECOINS.USDC,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[axusd/liquidity] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch liquidity data', details: error.message });
  }
}

async function fetchEulerSwapLiquidity(provider: ethers.JsonRpcProvider, deployed: boolean) {
  const empty = {
    dex: 'EulerSwap',
    status: 'PENDING_DEPLOYMENT',
    axusdReserve: '0',
    usdcReserve: '0',
    totalLiquidity: '0',
    totalValueUsd: 0,
    note: 'Pool pending on-chain deployment.',
  };
  if (!deployed || (EULER_SWAP_AXUSD_USDC_POOL_ADDRESS as string) === ZERO) return empty;

  try {
    const pool = new ethers.Contract(EULER_SWAP_AXUSD_USDC_POOL_ADDRESS, EULERSWAP_POOL_ABI, provider);
    const [reserves, token0, token1, totalSupply] = await Promise.all([
      pool.getReserves(),
      pool.token0(),
      pool.token1(),
      pool.totalSupply(),
    ]);

    // Both ERC-3643 AXUSD and USDC are 6 decimals, but we must respect pool ordering
    // (token0 / token1 order is deterministic by address sort, not by our preference)
    const AXUSD_ADDR = AXUSD_GENIUS_CONTRACTS.AXUSD.toLowerCase();
    const isAxusdToken0 = token0.toLowerCase() === AXUSD_ADDR;
    const axusdReserve = Number(ethers.formatUnits(isAxusdToken0 ? reserves[0] : reserves[1], 6));
    const usdcReserve  = Number(ethers.formatUnits(isAxusdToken0 ? reserves[1] : reserves[0], 6));
    const tvl = axusdReserve + usdcReserve;

    return {
      dex: 'EulerSwap',
      status: 'LIVE',
      axusdReserve: axusdReserve.toFixed(4),
      usdcReserve: usdcReserve.toFixed(4),
      totalLiquidity: Number(ethers.formatUnits(totalSupply, 18)).toFixed(6),
      totalValueUsd: tvl,
      tokens: { token0, token1, axusdIsToken0: isAxusdToken0 },
      note: 'Primary venue — LP earns swap fees + EVK vault lending yield.',
    };
  } catch {
    return { ...empty, status: 'ERROR', note: 'EulerSwap pool returned an error.' };
  }
}

