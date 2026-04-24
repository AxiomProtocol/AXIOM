import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { REAL_ESTATE_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const CAPITAL_POOLS_ABI = [
  "function getPoolCount() external view returns (uint256)",
  "function getPool(uint256 poolId) external view returns (string name, uint256 targetAmount, uint256 currentAmount, uint256 minContribution, bool isActive, uint8 riskLevel)",
  "function getTotalValueLocked() external view returns (uint256)",
  "function getPoolInvestors(uint256 poolId) external view returns (uint256)",
  "function getUserInvestments(address user) external view returns (uint256[] memory poolIds, uint256[] memory amounts)"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const capitalContract = new ethers.Contract(
      REAL_ESTATE_CONTRACTS.CAPITAL_POOLS,
      CAPITAL_POOLS_ABI,
      provider
    );

    let poolCount = 0;
    let totalValueLocked = BigInt(0);
    
    try {
      [poolCount, totalValueLocked] = await Promise.all([
        capitalContract.getPoolCount().then((n: bigint) => Number(n)).catch(() => 0),
        capitalContract.getTotalValueLocked().catch(() => BigInt(0))
      ]);
    } catch (e) {
      console.log('Using fallback for capital pools stats');
    }

    const opportunities: Array<{
      id: number;
      name: string;
      targetAmount: string;
      currentAmount: string;
      minContribution: string;
      progress: number;
      isActive: boolean;
      riskLevel: string;
      investors: number;
    }> = [];

    const riskLabels = ['Low', 'Medium', 'High', 'Very High'];

    if (poolCount > 0) {
      for (let i = 0; i < Math.min(poolCount, 20); i++) {
        try {
          const poolData = await capitalContract.getPool(i);
          const investors = await capitalContract.getPoolInvestors(i).catch(() => BigInt(0));
          
          if (poolData && poolData.isActive) {
            const target = poolData.targetAmount || BigInt(0);
            const current = poolData.currentAmount || BigInt(0);
            const progress = target > 0 ? Number((current * BigInt(100)) / target) : 0;

            opportunities.push({
              id: i,
              name: poolData.name || `Investment Pool ${i + 1}`,
              targetAmount: ethers.formatEther(target),
              currentAmount: ethers.formatEther(current),
              minContribution: ethers.formatEther(poolData.minContribution || BigInt(0)),
              progress: Math.min(progress, 100),
              isActive: poolData.isActive,
              riskLevel: riskLabels[Number(poolData.riskLevel)] || 'Medium',
              investors: Number(investors)
            });
          }
        } catch (poolError) {
          console.log(`Could not fetch pool ${i}`);
        }
      }
    }

    let userInvestments: Array<{poolId: number; amount: string}> = [];
    if (wallet && typeof wallet === 'string') {
      try {
        const [poolIds, amounts] = await capitalContract.getUserInvestments(wallet);
        userInvestments = poolIds.map((id: bigint, idx: number) => ({
          poolId: Number(id),
          amount: ethers.formatEther(amounts[idx])
        }));
      } catch (e) {
        console.log('User investments not available');
      }
    }

    res.status(200).json({
      success: true,
      stats: {
        totalPools: poolCount,
        activePools: opportunities.length,
        totalValueLocked: ethers.formatEther(totalValueLocked)
      },
      opportunities,
      userInvestments,
      contractAddress: REAL_ESTATE_CONTRACTS.CAPITAL_POOLS,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Capital opportunities error:', error);
    res.status(200).json({
      success: false,
      stats: { totalPools: 0, activePools: 0, totalValueLocked: '0' },
      opportunities: [],
      userInvestments: [],
      error: 'Failed to fetch capital opportunities'
    });
  }
}
