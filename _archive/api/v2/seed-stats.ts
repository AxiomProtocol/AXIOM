import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { V2_SOVEREIGN_BANKING_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const VE_AXM_ABI = [
  "function balanceOf(address user) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function totalLocked() view returns (uint256)",
  "function totalLockers() view returns (uint256)",
  "function getLock(address user) view returns (tuple(uint256 amount, uint256 unlockTime, uint256 lockStart))",
  "function getClaimableRewards(address user) view returns (uint256)",
  "function currentRewardEpoch() view returns (uint256)",
  "function totalRewardsDistributed() view returns (uint256)"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.query;
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const veAXM = new ethers.Contract(V2_SOVEREIGN_BANKING_CONTRACTS.VE_AXM, VE_AXM_ABI, provider);

    const [totalSupply, totalLocked, totalLockers, currentEpoch, totalRewards] = await Promise.all([
      veAXM.totalSupply().catch(() => BigInt(0)),
      veAXM.totalLocked().catch(() => BigInt(0)),
      veAXM.totalLockers().catch(() => BigInt(0)),
      veAXM.currentRewardEpoch().catch(() => BigInt(0)),
      veAXM.totalRewardsDistributed().catch(() => BigInt(0))
    ]);

    const globalStats = {
      totalVotingPower: ethers.formatEther(totalSupply),
      totalLocked: ethers.formatEther(totalLocked),
      totalLockers: Number(totalLockers),
      currentEpoch: Number(currentEpoch),
      totalRewardsDistributed: ethers.formatEther(totalRewards)
    };

    let userPosition = null;
    if (address && typeof address === 'string') {
      try {
        const [balance, lock, claimable] = await Promise.all([
          veAXM.balanceOf(address).catch(() => BigInt(0)),
          veAXM.getLock(address).catch(() => ({ amount: BigInt(0), unlockTime: BigInt(0), lockStart: BigInt(0) })),
          veAXM.getClaimableRewards(address).catch(() => BigInt(0))
        ]);

        userPosition = {
          votingPower: ethers.formatEther(balance),
          lockedAmount: ethers.formatEther(lock.amount),
          unlockTime: Number(lock.unlockTime),
          lockStart: Number(lock.lockStart),
          claimableRewards: ethers.formatEther(claimable)
        };
      } catch (e) {
        console.error('Error fetching user position:', e);
      }
    }

    return res.status(200).json({
      success: true,
      globalStats,
      userPosition
    });
  } catch (error: any) {
    console.error('veAXM stats error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch veAXM stats' });
  }
}
