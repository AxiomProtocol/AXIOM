import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { pool } from '../../../server/db';
import { AXUSD_GENIUS_CONTRACTS, STABLECOINS, V2_SOVEREIGN_BANKING_CONTRACTS } from '../../../shared/contracts';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY 
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const PAIR_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)'
];

const SEED_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function locked(address account) view returns (uint256 amount, uint256 end)'
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  if (!wallet || typeof wallet !== 'string' || !ethers.isAddress(wallet)) {
    return res.status(400).json({ success: false, error: 'Valid wallet address required' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    
    const axusd = new ethers.Contract(AXUSD_GENIUS_CONTRACTS.AXUSD, ERC20_ABI, provider);
    const usdc = new ethers.Contract(STABLECOINS.USDC, ERC20_ABI, provider);
    const lpPair = new ethers.Contract(AXUSD_GENIUS_CONTRACTS.LP_POOL_CAMELOT, PAIR_ABI, provider);
    const seed = new ethers.Contract(V2_SOVEREIGN_BANKING_CONTRACTS.SEED, SEED_ABI, provider);

    const [
      axusdBalance,
      usdcBalance,
      lpBalance,
      lpTotalSupply,
      reserves,
      token0,
      seedBalance,
      lockInfo
    ] = await Promise.all([
      axusd.balanceOf(wallet),
      usdc.balanceOf(wallet),
      lpPair.balanceOf(wallet),
      lpPair.totalSupply(),
      lpPair.getReserves(),
      lpPair.token0(),
      seed.balanceOf(wallet).catch(() => BigInt(0)),
      seed.locked(wallet).catch(() => ({ amount: BigInt(0), end: BigInt(0) }))
    ]);

    const axusdIsToken0 = token0.toLowerCase() === AXUSD_GENIUS_CONTRACTS.AXUSD.toLowerCase();
    const axusdReserve = axusdIsToken0 ? reserves[0] : reserves[1];
    const usdcReserve = axusdIsToken0 ? reserves[1] : reserves[0];

    const axusdReserveNum = parseFloat(ethers.formatEther(axusdReserve));
    const usdcReserveNum = parseFloat(ethers.formatUnits(usdcReserve, 6));
    const lpBalanceNum = parseFloat(ethers.formatEther(lpBalance));
    const lpTotalSupplyNum = parseFloat(ethers.formatEther(lpTotalSupply));
    const tvl = axusdReserveNum + usdcReserveNum;

    const poolShare = lpTotalSupplyNum > 0 ? (lpBalanceNum / lpTotalSupplyNum) : 0;
    const lpValueUsd = poolShare * tvl;
    const userAxusdInPool = axusdReserveNum * poolShare;
    const userUsdcInPool = usdcReserveNum * poolShare;

    const incentivesResult = await pool.query(
      `SELECT * FROM lp_incentive_programs 
       WHERE pool_address = $1 AND is_active = true`,
      [AXUSD_GENIUS_CONTRACTS.LP_POOL_CAMELOT]
    );

    let estimatedRewards = 0;
    let activeProgram = null;
    if (incentivesResult.rows.length > 0 && lpBalanceNum > 0) {
      activeProgram = incentivesResult.rows[0];
      const dailyRewards = parseFloat(activeProgram.rewards_per_day || '0');
      const multiplier = parseFloat(activeProgram.bonus_multiplier || '1');
      estimatedRewards = (dailyRewards * poolShare * multiplier);
    }

    const seedBalanceNum = parseFloat(ethers.formatEther(seedBalance));
    const lockedAmountNum = parseFloat(ethers.formatEther(lockInfo.amount));
    const lockEnd = Number(lockInfo.end);
    const now = Math.floor(Date.now() / 1000);
    const remainingDays = lockEnd > now ? Math.floor((lockEnd - now) / 86400) : 0;

    res.status(200).json({
      success: true,
      data: {
        wallet,
        balances: {
          axusd: parseFloat(ethers.formatEther(axusdBalance)).toFixed(4),
          usdc: parseFloat(ethers.formatUnits(usdcBalance, 6)).toFixed(2),
          lpTokens: lpBalanceNum.toFixed(6)
        },
        lpPosition: {
          poolShare: (poolShare * 100).toFixed(4),
          valueUsd: lpValueUsd.toFixed(2),
          axusdInPool: userAxusdInPool.toFixed(4),
          usdcInPool: userUsdcInPool.toFixed(4)
        },
        incentives: activeProgram ? {
          programName: activeProgram.name,
          rewardToken: activeProgram.reward_token_symbol,
          estimatedDailyRewards: estimatedRewards.toFixed(4),
          estimatedMonthlyRewards: (estimatedRewards * 30).toFixed(2),
          bonusMultiplier: activeProgram.bonus_multiplier
        } : null,
        seed: {
          balance: seedBalanceNum.toFixed(4),
          locked: lockedAmountNum.toFixed(4),
          lockEndDate: lockEnd > 0 ? new Date(lockEnd * 1000).toISOString() : null,
          remainingDays
        },
        totalValueUsd: (
          parseFloat(ethers.formatEther(axusdBalance)) +
          parseFloat(ethers.formatUnits(usdcBalance, 6)) +
          lpValueUsd
        ).toFixed(2),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Wallet position API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet position',
      details: error.message
    });
  }
}
