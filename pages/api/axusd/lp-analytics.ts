import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { AXUSD_GENIUS_CONTRACTS, STABLECOINS } from '../../../shared/contracts';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY 
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)'
];

const CAMELOT_FEE_RATE = 0.003;
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const pair = new ethers.Contract(
      AXUSD_GENIUS_CONTRACTS.LP_POOL_CAMELOT,
      PAIR_ABI,
      provider
    );

    const [reserves, token0, totalLpSupply] = await Promise.all([
      pair.getReserves(),
      pair.token0(),
      pair.totalSupply()
    ]);

    const axusdIsToken0 = token0.toLowerCase() === AXUSD_GENIUS_CONTRACTS.AXUSD.toLowerCase();
    const axusdReserve = axusdIsToken0 ? reserves[0] : reserves[1];
    const usdcReserve = axusdIsToken0 ? reserves[1] : reserves[0];

    const axusdReserveNum = parseFloat(ethers.formatEther(axusdReserve));
    const usdcReserveNum = parseFloat(ethers.formatUnits(usdcReserve, 6));
    const totalLpSupplyNum = parseFloat(ethers.formatEther(totalLpSupply));
    
    const tvl = axusdReserveNum + usdcReserveNum;
    const pricePerLpToken = totalLpSupplyNum > 0 ? tvl / totalLpSupplyNum : 0;

    const estimatedDailyVolume = tvl * 0.1;
    const dailyFees = estimatedDailyVolume * CAMELOT_FEE_RATE;
    const annualFees = dailyFees * 365;
    const apr = tvl > 0 ? (annualFees / tvl) * 100 : 0;

    let walletData = null;
    if (wallet && typeof wallet === 'string' && ethers.isAddress(wallet)) {
      const walletLpBalance = await pair.balanceOf(wallet);
      const walletLpNum = parseFloat(ethers.formatEther(walletLpBalance));
      const poolShare = totalLpSupplyNum > 0 ? (walletLpNum / totalLpSupplyNum) * 100 : 0;
      const walletValue = walletLpNum * pricePerLpToken;
      const walletAxusd = axusdReserveNum * (poolShare / 100);
      const walletUsdc = usdcReserveNum * (poolShare / 100);

      walletData = {
        lpBalance: walletLpNum.toFixed(6),
        poolShare: poolShare.toFixed(4),
        valueUsd: walletValue.toFixed(2),
        axusdShare: walletAxusd.toFixed(4),
        usdcShare: walletUsdc.toFixed(4),
        estimatedDailyFees: (dailyFees * (poolShare / 100)).toFixed(4),
        estimatedAnnualFees: (annualFees * (poolShare / 100)).toFixed(2)
      };
    }

    const weeklyGrowthScenarios = [100, 250, 500, 1000].map(weeklyAdd => {
      const weeks = [4, 12, 26, 52];
      return {
        weeklyContribution: weeklyAdd,
        projections: weeks.map(w => ({
          weeks: w,
          totalTvl: (tvl + (weeklyAdd * w)).toFixed(2),
          tradingCapacity: ((tvl + (weeklyAdd * w)) / tvl).toFixed(1) + 'x'
        }))
      };
    });

    res.status(200).json({
      success: true,
      data: {
        pool: {
          address: AXUSD_GENIUS_CONTRACTS.LP_POOL_CAMELOT,
          dex: 'Camelot',
          pair: 'AXUSD/USDC',
          axusdReserve: axusdReserveNum.toFixed(4),
          usdcReserve: usdcReserveNum.toFixed(4),
          totalLpSupply: totalLpSupplyNum.toFixed(6),
          tvl: tvl.toFixed(2),
          pricePerLpToken: pricePerLpToken.toFixed(6)
        },
        metrics: {
          estimatedDailyVolume: estimatedDailyVolume.toFixed(2),
          dailyFees: dailyFees.toFixed(4),
          annualFees: annualFees.toFixed(2),
          apr: apr.toFixed(2),
          feeRate: (CAMELOT_FEE_RATE * 100).toFixed(2) + '%'
        },
        wallet: walletData,
        growthScenarios: weeklyGrowthScenarios,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('LP Analytics API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch LP analytics',
      details: error.message
    });
  }
}
