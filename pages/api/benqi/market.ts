import type { NextApiRequest, NextApiResponse } from 'next';
import { getBenqiMarket } from '../../../lib/defi/benqi/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const data = await getBenqiMarket();
  if (!data) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Benqi Avalanche market data is temporarily unavailable.',
    });
  }
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  return res.status(200).json(data);
}
