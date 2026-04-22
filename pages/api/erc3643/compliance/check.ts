import type { NextApiRequest, NextApiResponse } from 'next';
import { ERC3643Service } from '../../../../lib/services/ERC3643Service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { from, to, amount } = req.query;
  if (!from || !to || !amount) {
    return res.status(400).json({ error: 'from, to, and amount query parameters required' });
  }
  if (typeof from !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(from)) {
    return res.status(400).json({ error: 'Valid from address required' });
  }
  if (typeof to !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(to)) {
    return res.status(400).json({ error: 'Valid to address required' });
  }

  try {
    const result = await ERC3643Service.isCompliant(from, to, amount as string);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
