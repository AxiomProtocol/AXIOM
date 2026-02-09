import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { V2_SOVEREIGN_BANKING_CONTRACTS, AXUSD_INTEGRATION_CONTRACTS, AXUSD_GENIUS_CONTRACTS } from '../../../shared/contracts';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY 
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const SEED_ABI = [
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function locked(address account) view returns (uint256 amount, uint256 end)'
];

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)'
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { axmAmount, lockYears, wallet } = req.query;

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    
    const seed = new ethers.Contract(V2_SOVEREIGN_BANKING_CONTRACTS.SEED, SEED_ABI, provider);
    const axusd = new ethers.Contract(AXUSD_GENIUS_CONTRACTS.AXUSD, ERC20_ABI, provider);

    const [totalSeedSupply, distributorBalance] = await Promise.all([
      seed.totalSupply(),
      axusd.balanceOf(AXUSD_INTEGRATION_CONTRACTS.SEED_YIELD_DISTRIBUTOR).catch(() => BigInt(0))
    ]);

    const totalSeedNum = parseFloat(ethers.formatEther(totalSeedSupply));
    const distributorBalanceNum = parseFloat(ethers.formatEther(distributorBalance));

    const estimatedWeeklyYield = 100;
    const estimatedAnnualYield = estimatedWeeklyYield * 52;

    let userProjection = null;
    if (axmAmount && lockYears) {
      const axmNum = parseFloat(axmAmount as string);
      const years = parseFloat(lockYears as string);
      
      const lockMultiplier = Math.min(years / 4, 1);
      const seedReceived = axmNum * lockMultiplier;
      
      const userShare = totalSeedNum > 0 ? seedReceived / (totalSeedNum + seedReceived) : 1;
      const weeklyYield = estimatedWeeklyYield * userShare;
      const annualYield = weeklyYield * 52;
      const apr = axmNum > 0 ? (annualYield / axmNum) * 100 : 0;

      userProjection = {
        axmLocked: axmNum.toFixed(2),
        lockDuration: `${years} year${years > 1 ? 's' : ''}`,
        lockMultiplier: lockMultiplier.toFixed(2),
        seedReceived: seedReceived.toFixed(4),
        poolSharePercent: (userShare * 100).toFixed(4),
        estimatedWeeklyYield: weeklyYield.toFixed(4),
        estimatedMonthlyYield: (weeklyYield * 4.33).toFixed(2),
        estimatedAnnualYield: annualYield.toFixed(2),
        effectiveApr: apr.toFixed(2)
      };
    }

    let walletData = null;
    if (wallet && typeof wallet === 'string' && ethers.isAddress(wallet)) {
      const [seedBalance, lockInfo] = await Promise.all([
        seed.balanceOf(wallet),
        seed.locked(wallet).catch(() => ({ amount: BigInt(0), end: BigInt(0) }))
      ]);

      const seedBalanceNum = parseFloat(ethers.formatEther(seedBalance));
      const lockedAmountNum = parseFloat(ethers.formatEther(lockInfo.amount));
      const lockEnd = Number(lockInfo.end);
      const now = Math.floor(Date.now() / 1000);
      const remainingSeconds = Math.max(0, lockEnd - now);
      const remainingDays = Math.floor(remainingSeconds / 86400);

      const userShare = totalSeedNum > 0 ? seedBalanceNum / totalSeedNum : 0;
      const weeklyYield = estimatedWeeklyYield * userShare;

      walletData = {
        seedBalance: seedBalanceNum.toFixed(4),
        axmLocked: lockedAmountNum.toFixed(4),
        lockEndTimestamp: lockEnd,
        lockEndDate: lockEnd > 0 ? new Date(lockEnd * 1000).toISOString() : null,
        remainingDays,
        poolSharePercent: (userShare * 100).toFixed(4),
        estimatedWeeklyYield: weeklyYield.toFixed(4),
        estimatedAnnualYield: (weeklyYield * 52).toFixed(2)
      };
    }

    const lockComparison = [1, 2, 3, 4].map(years => {
      const baseAmount = 1000;
      const multiplier = years / 4;
      const seedAmount = baseAmount * multiplier;
      const share = totalSeedNum > 0 ? seedAmount / (totalSeedNum + seedAmount) : 1;
      const annualYield = estimatedAnnualYield * share;
      
      return {
        lockYears: years,
        multiplier: multiplier.toFixed(2),
        seedFor1000Axm: seedAmount.toFixed(2),
        estimatedAnnualYield: annualYield.toFixed(2),
        effectiveApr: ((annualYield / baseAmount) * 100).toFixed(2)
      };
    });

    res.status(200).json({
      success: true,
      data: {
        protocol: {
          totalSeedSupply: totalSeedNum.toFixed(4),
          distributorBalance: distributorBalanceNum.toFixed(4),
          estimatedWeeklyYield: estimatedWeeklyYield.toFixed(2),
          estimatedAnnualYield: estimatedAnnualYield.toFixed(2)
        },
        userProjection,
        wallet: walletData,
        lockComparison,
        info: {
          minLockDuration: '1 year',
          maxLockDuration: '4 years',
          maxMultiplier: '1x (at 4 years)',
          yieldToken: 'AXUSD',
          distributionFrequency: 'Weekly'
        },
        contracts: {
          seed: V2_SOVEREIGN_BANKING_CONTRACTS.SEED,
          yieldDistributor: AXUSD_INTEGRATION_CONTRACTS.SEED_YIELD_DISTRIBUTOR
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Yield Calculator API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate yield',
      details: error.message
    });
  }
}
