import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { V2_SOVEREIGN_BANKING_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const AXIOM_SCORE_SBT_ABI = [
  "function getScore(address user) view returns (uint256)",
  "function getProfile(address user) view returns (tuple(uint256 score, uint256 totalLoans, uint256 successfulRepayments, uint256 defaults, uint256 lastUpdated, bool isActive))",
  "function getScoreTier(address user) view returns (string)",
  "function getPaymentCount(address user) view returns (uint256)",
  "function totalProfiles() view returns (uint256)"
];

function getScoreTierName(score: number): string {
  if (score >= 800) return 'Excellent';
  if (score >= 740) return 'Very Good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  if (score >= 300) return 'Poor';
  return 'No Score';
}

function getScoreColor(score: number): string {
  if (score >= 800) return 'emerald';
  if (score >= 740) return 'green';
  if (score >= 670) return 'yellow';
  if (score >= 580) return 'orange';
  return 'red';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;
  
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address required' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const scoreSBT = new ethers.Contract(V2_SOVEREIGN_BANKING_CONTRACTS.AXIOM_SCORE_SBT, AXIOM_SCORE_SBT_ABI, provider);

    const [profile, totalProfiles] = await Promise.all([
      scoreSBT.getProfile(address).catch(() => null),
      scoreSBT.totalProfiles().catch(() => BigInt(0))
    ]);

    if (!profile || !profile.isActive) {
      return res.status(200).json({
        success: true,
        hasProfile: false,
        score: null,
        profile: null,
        totalProfiles: Number(totalProfiles)
      });
    }

    const score = Number(profile.score);

    return res.status(200).json({
      success: true,
      hasProfile: true,
      score,
      tier: getScoreTierName(score),
      color: getScoreColor(score),
      profile: {
        score,
        totalLoans: Number(profile.totalLoans),
        successfulRepayments: Number(profile.successfulRepayments),
        defaults: Number(profile.defaults),
        lastUpdated: Number(profile.lastUpdated),
        isActive: profile.isActive
      },
      totalProfiles: Number(totalProfiles)
    });
  } catch (error: any) {
    console.error('Credit score error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch credit score' });
  }
}
