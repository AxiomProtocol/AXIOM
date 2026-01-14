import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address required' });
  }

  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }

  try {
    const earnedBadges = [
      { id: 'first-susu', earnedAt: Date.now() - 60 * 24 * 60 * 60 * 1000 },
      { id: 'circle-complete', earnedAt: Date.now() - 30 * 24 * 60 * 60 * 1000 },
      { id: 'veaxm-holder', earnedAt: Date.now() - 7 * 24 * 60 * 60 * 1000 }
    ];

    const progress = {
      'one-year': { current: 120, max: 365 },
      'perfect-score': { current: 8, max: 12 },
      'referrer-10': { current: 3, max: 10 },
      'high-credit': { current: 650, max: 800 }
    };

    return res.status(200).json({
      success: true,
      badges: earnedBadges,
      progress,
      totalEarned: earnedBadges.length,
      totalAvailable: 10
    });
  } catch (error: any) {
    console.error('Badges API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch badges'
    });
  }
}
