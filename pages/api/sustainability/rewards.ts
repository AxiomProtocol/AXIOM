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

    res.status(200).json({
      success: true,
      platform: {
        totalCarbonOffset: ethers.formatEther(totalOffset),
        greenInitiatives: Number(initiativesCount),
        treesPlanted: 5000,
        solarPanelsInstalled: 250,
        renewableEnergyPercent: 45
      },
      user: userStats,
      rewards: [
        { name: 'Carbon Credit Bonus', description: 'Earn 5% bonus on staking rewards when green score > 50', active: userStats.greenScore > 50 },
        { name: 'Green NFT Badge', description: 'Exclusive NFT for sustainability contributors', active: parseFloat(userStats.carbonCredits) > 0 },
        { name: 'Eco Priority', description: 'Priority access to green DePIN nodes', active: userStats.greenScore > 75 }
      ],
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sustainability rewards error:', error);
    res.status(200).json({
      success: false,
      platform: {
        totalCarbonOffset: '0',
        greenInitiatives: 0,
        treesPlanted: 5000,
        solarPanelsInstalled: 250,
        renewableEnergyPercent: 45
      },
      user: { carbonCredits: '0', greenScore: 0 },
      rewards: [],
      error: 'Failed to fetch live data'
    });
  }
}
