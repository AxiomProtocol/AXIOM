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
    const referralCode = `AXM-${address.slice(2, 8).toUpperCase()}`;
    const referralLink = `https://axiom.city/?ref=${referralCode}`;

    const sampleReferrals = [
      {
        id: '1',
        address: '0x1234567890123456789012345678901234567890',
        joinedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        status: 'active' as const,
        rewardEarned: '50'
      },
      {
        id: '2',
        address: '0x2345678901234567890123456789012345678901',
        joinedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
        status: 'pending' as const,
        rewardEarned: '0'
      }
    ];

    return res.status(200).json({
      success: true,
      stats: {
        totalReferrals: 2,
        activeReferrals: 1,
        totalRewardsEarned: '50',
        pendingRewards: '50',
        referralCode,
        referralLink
      },
      referrals: sampleReferrals
    });
  } catch (error: any) {
    console.error('Referral API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch referrals'
    });
  }
}
