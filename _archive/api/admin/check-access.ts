import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminWallet, getAdminWallets } from '../../../lib/admin/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { wallet } = req.body;

  if (!wallet) {
    return res.status(400).json({ isAdmin: false });
  }

  res.status(200).json({ 
    isAdmin: isAdminWallet(wallet)
  });
}
