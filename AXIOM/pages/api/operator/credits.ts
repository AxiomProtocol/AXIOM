import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminWallet } from '../../../lib/admin/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminWallet = req.headers['x-admin-wallet'] as string | undefined;

  if (!adminWallet || !isAdminWallet(adminWallet)) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  return res.status(200).json({
    success: true,
    ledgers: [],
    summary: {
      totalAvailable: '0',
      totalPending: '0',
      totalEarned: '0',
      totalRedeemed: '0',
      totalSlashed: '0',
      operatorCount: 0,
    },
  });
}