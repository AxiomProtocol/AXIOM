import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { SUSTAINABILITY_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const SUSTAINABILITY_ABI = [
  "function getUserCarbonCredits(address user) external view returns (uint256)",
  "function getTotalCarbonOffset() external view returns (uint256)",
  "function getGreenInitiativesCount() external view returns (uint256)",
  "function getUserGreenScore(address user) external view returns (uint256)"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const sustainabilityContract = new ethers.Contract(
      SUSTAINABILITY_CONTRACTS.SUSTAINABILITY,
      SUSTAINABILITY_ABI,
      provider
    );

    let userStats = {
      carbonCredits: '0',
      greenScore: 0
    };

    if (wallet && typeof wallet === 'string') {
      const [carbonCredits, greenScore] = await Promise.all([
        sustainabilityContract.getUserCarbonCredits(wallet).catch(() => BigInt(0)),
        sustainabilityContract.getUserGreenScore(wallet).catch(() => BigInt(0))
      ]);

      userStats = {
        carbonCredits: ethers.formatEther(carbonCredits),
        greenScore: Number(greenScore)
      };
    }

    const [totalOffset, initiativesCount] = await Promise.all([
      sustainabilityContract.getTotalCarbonOffset().catch(() => BigInt(0)),
      sustainabilityContract.getGreenInitiativesCount().catch(() => BigInt(0))
    ]);

    const rewards: Array<{name: string; description: string; active: boolean}> = [];
    if (userStats.greenScore > 50) {
      rewards.push({ name: 'Carbon Credit Bonus', description: 'Earn 5% bonus on staking rewards', active: true });
    }
    if (parseFloat(userStats.carbonCredits) > 0) {
      rewards.push({ name: 'Green Contributor', description: 'Active sustainability contributor', active: true });
    }
    if (userStats.greenScore > 75) {
      rewards.push({ name: 'Eco Priority', description: 'Priority access to green DePIN nodes', active: true });
    }

    res.status(200).json({
      success: true,
      platform: {
        totalCarbonOffset: ethers.formatEther(totalOffset),
        greenInitiatives: Number(initiativesCount)
      },
      user: userStats,
      rewards,
      contractAddress: SUSTAINABILITY_CONTRACTS.SUSTAINABILITY,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sustainability rewards error:', error);
    res.status(200).json({
      success: false,
      platform: {
        totalCarbonOffset: '0',
        greenInitiatives: 0
      },
      user: { carbonCredits: '0', greenScore: 0 },
      rewards: [],
      error: 'Failed to fetch live contract data'
    });
  }
}
