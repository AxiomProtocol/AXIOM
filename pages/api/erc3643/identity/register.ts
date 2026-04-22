import type { NextApiRequest, NextApiResponse } from 'next';
import { ERC3643Service } from '../../../../lib/services/ERC3643Service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_SOLVENCY_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { wallet, countryCode } = req.body;
  if (!wallet || typeof wallet !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Valid wallet address required' });
  }

  try {
    const result = await ERC3643Service.registerIdentity(wallet, countryCode ?? 840);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
