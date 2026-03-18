import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminWallet } from '../../../../lib/admin/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminWallet = req.headers['x-admin-wallet'] as string | undefined;

  if (!adminWallet || !isAdminWallet(adminWallet)) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    notes: [],
    summary: {
      totalNotes: 0,
      activeNotes: 0,
      currentNotes: 0,
      delinquentNotes: 0,
      paidOffNotes: 0,
      totalOutstanding: 0,
      totalPayments: 0,
    },
    pagination: {
      limit: 50,
      offset: 0,
      total: 0,
      hasMore: false,
    },
  });
}