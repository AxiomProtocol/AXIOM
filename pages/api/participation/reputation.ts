import type { NextApiRequest, NextApiResponse } from 'next';
import { calculateReputationLevel } from '../../../lib/axiomHolderValue';

/**
 * GET /api/participation/reputation?wallet=0x...
 * Returns steward reputation for a wallet
 * 
 * TODO: Wire to on-chain reputation tracking when available
 * Currently returns placeholder data
 */

interface ReputationBreakdown {
  holdingPeriods: number;
  actionsCompleted: number;
  onboardingComplete: boolean;
  susuCycles: number;
  votes: number;
}

interface ReputationResponse {
  wallet: string;
  points: number;
  level: number;
  levelName: string;
  breakdown: ReputationBreakdown;
  unlocks: string[];
}

const walletReputation: Map<string, { points: number; breakdown: ReputationBreakdown }> = new Map();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet } = req.query;

    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }

    const normalizedWallet = wallet.toLowerCase();
    
    let storedData = walletReputation.get(normalizedWallet);
    
    if (!storedData) {
      const randomPoints = Math.floor(Math.random() * 12) + 1;
      storedData = {
        points: randomPoints,
        breakdown: {
          holdingPeriods: Math.floor(randomPoints * 0.4),
          actionsCompleted: Math.floor(randomPoints * 0.3),
          onboardingComplete: randomPoints > 3,
          susuCycles: Math.floor(randomPoints * 0.2),
          votes: Math.floor(randomPoints * 0.1)
        }
      };
      walletReputation.set(normalizedWallet, storedData);
    }

    const levelData = calculateReputationLevel(storedData.points);

    const response: ReputationResponse = {
      wallet: normalizedWallet,
      points: storedData.points,
      level: levelData.level,
      levelName: levelData.name,
      breakdown: storedData.breakdown,
      unlocks: levelData.unlocks
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Reputation fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch reputation' });
  }
}
