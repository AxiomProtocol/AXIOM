import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminWallet } from '../../../../lib/admin/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminWallet = req.headers['x-admin-wallet'] as string | undefined;

  if (!adminWallet || !isAdminWallet(adminWallet)) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  return res.status(200).json({ operators: [] });
}