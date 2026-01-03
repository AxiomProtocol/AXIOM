import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * POST /api/participation/join-stewards
 * Joins the Steward Cohort waitlist
 * 
 * TODO: Wire to on-chain contract when available
 * Currently uses off-chain placeholder storage
 */

interface StewardApplication {
  wallet: string;
  timestamp: number;
  tier: number;
}

const stewardWaitlist: Map<string, StewardApplication> = new Map();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet, tier } = req.body;

    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }

    const normalizedWallet = wallet.toLowerCase();
    
    if (stewardWaitlist.has(normalizedWallet)) {
      return res.status(200).json({ 
        success: true, 
        message: 'Already on steward waitlist',
        alreadyRegistered: true,
        position: Array.from(stewardWaitlist.keys()).indexOf(normalizedWallet) + 1
      });
    }

    const application: StewardApplication = {
      wallet: normalizedWallet,
      timestamp: Date.now(),
      tier: tier || 0
    };

    stewardWaitlist.set(normalizedWallet, application);

    return res.status(200).json({
      success: true,
      message: 'Added to steward waitlist',
      position: stewardWaitlist.size
    });

  } catch (error) {
    console.error('Steward join error:', error);
    return res.status(500).json({ error: 'Failed to join waitlist' });
  }
}
