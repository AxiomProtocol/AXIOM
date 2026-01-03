import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * GET /api/participation/credits?wallet=0x...
 * Returns participation credits for a wallet
 * 
 * TODO: Wire to on-chain credit tracking when available
 * Currently returns placeholder data based on wallet
 */

interface CreditsResponse {
  wallet: string;
  credits: number;
  breakdown: {
    holdingCredits: number;
    actionCredits: number;
    bonusCredits: number;
  };
  tier: number;
  estimatedDaysHeld: number;
}

const walletCredits: Map<string, number> = new Map();

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
    
    const storedCredits = walletCredits.get(normalizedWallet);
    const credits = storedCredits ?? Math.floor(Math.random() * 20) + 5;
    
    if (!storedCredits) {
      walletCredits.set(normalizedWallet, credits);
    }

    const response: CreditsResponse = {
      wallet: normalizedWallet,
      credits,
      breakdown: {
        holdingCredits: Math.floor(credits * 0.5),
        actionCredits: Math.floor(credits * 0.3),
        bonusCredits: Math.floor(credits * 0.2)
      },
      tier: credits >= 15 ? 3 : credits >= 8 ? 2 : credits >= 1 ? 1 : 0,
      estimatedDaysHeld: credits * 10
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Credits fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch credits' });
  }
}
