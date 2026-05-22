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

const CAMELOT_PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
];

const EULERSWAP_POOL_ABI = [
  'function getReserves() view returns (uint256 reserve0, uint256 reserve1)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function fee() view returns (uint256)',
];

const ZERO = '0x0000000000000000000000000000000000000000';
const AXUSD_ADDRESS = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const CAMELOT_FEE_RATE = 0.003;

const EVK_SUPPLY_APY_BPS = 350;

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function formatEulerSwapStableReserve(raw: bigint, tokenAddress: string): number {
  if (sameAddress(tokenAddress, STABLECOINS.USDC)) return Number(ethers.formatUnits(raw, 6));
  if (sameAddress(tokenAddress, AXUSD_ADDRESS)) return Number(ethers.formatUnits(raw, 18));
  return 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { wallet } = req.query;
  const walletAddr = typeof wallet === 'string' && ethers.isAddress(wallet) ? wallet : null;

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);

    const eulerSwapDeployed = isEulerSwapDeployed();
    const eulerSwapAddress  = EULER_SWAP_AXUSD_USDC_POOL_ADDRESS;

    const [camelotData, eulerSwapData] = await Promise.all([
      fetchCamelotPool(provider, walletAddr),
      fetchEulerSwapPool(provider, eulerSwapAddress, eulerSwapDeployed, walletAddr),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        primaryVenue: eulerSwapDeployed ? 'EulerSwap' : 'Camelot',
        eulerSwap: {
          address: eulerSwapAddress,
          status: eulerSwapDeployed ? 'LIVE' : 'PENDING_DEPLOYMENT',
          pair: 'AXUSD/USDC',
          dex: 'EulerSwap',
          tvlUsd: eulerSwapData.tvlUsd,
          axusdReserve: eulerSwapData.axusdReserve.toFixed(4),
          usdcReserve: eulerSwapData.usdcReserve.toFixed(4),
          totalLpSupply: eulerSwapData.totalSupply.toFixed(6),
          yield: {
            swapFeeApyBps: eulerSwapData.swapFeeApyBps,
            swapFeeApyPct: (eulerSwapData.swapFeeApyBps / 100).toFixed(2),
            lendingApyBps: EVK_SUPPLY_APY_BPS,
            lendingApyPct: (EVK_SUPPLY_APY_BPS / 100).toFixed(2),
            blendedApyBps: eulerSwapData.swapFeeApyBps + EVK_SUPPLY_APY_BPS,
            blendedApyPct: ((eulerSwapData.swapFeeApyBps + EVK_SUPPLY_APY_BPS) / 100).toFixed(2),
            blendedApyLabel: 'Variable',
            note: 'Blended = swap fee yield + EVK vault lending yield. Both are variable and not guaranteed.',
          },
          feeBps: eulerSwapData.feeBps,
          erc3643Required: true,
          wallet: eulerSwapData.walletData,
        },
        camelot: {
          address: AXUSD_GENIUS_CONTRACTS.LP_POOL_CAMELOT,
          status: 'LIVE',
          pair: 'AXUSD/USDC',
          dex: 'Camelot',
          tvlUsd: camelotData.tvlUsd,
          axusdReserve: camelotData.axusdReserve.toFixed(4),
          usdcReserve: camelotData.usdcReserve.toFixed(4),
          totalLpSupply: camelotData.totalSupply.toFixed(6),
          yield: {
            swapFeeApyBps: camelotData.swapFeeApyBps,
            swapFeeApyPct: (camelotData.swapFeeApyBps / 100).toFixed(2),
            lendingApyBps: 0,
            lendingApyPct: '0.00',
            blendedApyBps: camelotData.swapFeeApyBps,
            blendedApyPct: (camelotData.swapFeeApyBps / 100).toFixed(2),
            blendedApyLabel: 'Variable',
            note: 'Swap fee yield only. No lending yield on Camelot.',
          },
          feeBps: 30,
          wallet: camelotData.walletData,
        },
        growthScenarios: buildGrowthScenarios(eulerSwapData.tvlUsd || camelotData.tvlUsd),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[lp-analytics] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch LP analytics', details: error.message });
  }
}

async function fetchCamelotPool(provider: ethers.JsonRpcProvider, walletAddr: string | null) {
  try {
    const pair = new ethers.Contract(AXUSD_GENIUS_CONTRACTS.LP_POOL_CAMELOT, CAMELOT_PAIR_ABI, provider);
    const [reserves, token0, totalLpSupply] = await Promise.all([
      pair.getReserves(),
      pair.token0(),
      pair.totalSupply(),
    ]);

    const axusdIsToken0 = token0.toLowerCase() === AXUSD_GENIUS_CONTRACTS.AXUSD.toLowerCase();
    const axusdReserve  = parseFloat(ethers.formatEther(axusdIsToken0 ? reserves[0] : reserves[1]));
    const usdcReserve   = parseFloat(ethers.formatUnits(axusdIsToken0 ? reserves[1] : reserves[0], 6));
    const totalSupply   = parseFloat(ethers.formatEther(totalLpSupply));
    const tvlUsd        = axusdReserve + usdcReserve;
    const dailyVol      = tvlUsd * 0.1;
    const annualFees    = dailyVol * CAMELOT_FEE_RATE * 365;
    const swapFeeApyBps = tvlUsd > 0 ? Math.round((annualFees / tvlUsd) * 10000) : 0;

    let walletData = null;
    if (walletAddr) {
      const lpBalance  = await pair.balanceOf(walletAddr);
      const lpNum      = parseFloat(ethers.formatEther(lpBalance));
      const poolShare  = totalSupply > 0 ? (lpNum / totalSupply) * 100 : 0;
      walletData = {
        lpBalance: lpNum.toFixed(6),
        poolShare: poolShare.toFixed(4),
        valueUsd: (lpNum / totalSupply * tvlUsd).toFixed(2),
        estimatedAnnualFees: (annualFees * (poolShare / 100)).toFixed(2),
      };
    }
    return { axusdReserve, usdcReserve, totalSupply, tvlUsd, swapFeeApyBps, walletData };
  } catch {
    return { axusdReserve: 0, usdcReserve: 0, totalSupply: 0, tvlUsd: 0, swapFeeApyBps: 0, walletData: null };
  }
}

async function fetchEulerSwapPool(
  provider: ethers.JsonRpcProvider,
  poolAddress: string,
  deployed: boolean,
  walletAddr: string | null,
) {
  const empty = { axusdReserve: 0, usdcReserve: 0, totalSupply: 0, tvlUsd: 0, swapFeeApyBps: 0, feeBps: 30, walletData: null };
  if (!deployed || poolAddress === ZERO) return empty;

  try {
    const pool = new ethers.Contract(poolAddress, EULERSWAP_POOL_ABI, provider);
    const [reserves, token0, token1, totalLpSupply] = await Promise.all([
      pool.getReserves(),
      pool.token0(),
      pool.token1(),
      pool.totalSupply(),
    ]);
    let feeBps = 30;
    try { feeBps = Number(await pool.fee()); } catch {}

    const axusdReserve =
      sameAddress(token0 as string, AXUSD_ADDRESS)
        ? formatEulerSwapStableReserve(reserves[0] as bigint, token0 as string)
        : formatEulerSwapStableReserve(reserves[1] as bigint, token1 as string);
    const usdcReserve =
      sameAddress(token0 as string, STABLECOINS.USDC)
        ? formatEulerSwapStableReserve(reserves[0] as bigint, token0 as string)
        : formatEulerSwapStableReserve(reserves[1] as bigint, token1 as string);
    const totalSupply  = Number(ethers.formatUnits(totalLpSupply, 18));
    const tvlUsd       = axusdReserve + usdcReserve;
    const dailyVol     = tvlUsd * 0.15;
    const annualFees   = dailyVol * (feeBps / 10000) * 365;
    const swapFeeApyBps = tvlUsd > 0 ? Math.round((annualFees / tvlUsd) * 10000) : 0;

    let walletData = null;
    if (walletAddr) {
      const lpBalance = await pool.balanceOf(walletAddr);
      const lpNum     = Number(ethers.formatUnits(lpBalance, 18));
      const poolShare = totalSupply > 0 ? (lpNum / totalSupply) * 100 : 0;
      const lendingApy = EVK_SUPPLY_APY_BPS / 10000;
      walletData = {
        lpBalance: lpNum.toFixed(6),
        poolShare: poolShare.toFixed(4),
        valueUsd: (lpNum / totalSupply * tvlUsd).toFixed(2),
        estimatedAnnualSwapFees: (annualFees * (poolShare / 100)).toFixed(2),
        estimatedAnnualLendingYield: (tvlUsd * (poolShare / 100) * lendingApy).toFixed(2),
      };
    }
    return { axusdReserve, usdcReserve, totalSupply, tvlUsd, swapFeeApyBps, feeBps, walletData };
  } catch {
    return empty;
  }
}

function buildGrowthScenarios(currentTvl: number) {
  return [100, 250, 500, 1000].map(weeklyAdd => ({
    weeklyContribution: weeklyAdd,
    projections: [4, 12, 26, 52].map(w => ({
      weeks: w,
      totalTvl: (currentTvl + weeklyAdd * w).toFixed(2),
      tradingCapacity: currentTvl > 0 ? ((currentTvl + weeklyAdd * w) / currentTvl).toFixed(1) + 'x' : 'N/A',
    })),
  }));
}
