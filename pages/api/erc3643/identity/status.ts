import type { NextApiRequest, NextApiResponse } from 'next';
import { ERC3643Service } from '../../../../lib/services/ERC3643Service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { wallet } = req.query;
  if (!wallet || typeof wallet !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Valid wallet address required as query parameter' });
  }

  try {
    const status = await ERC3643Service.getIdentityStatus(wallet);
    return res.status(200).json({ success: true, data: status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
