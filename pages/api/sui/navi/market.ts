import type { NextApiRequest, NextApiResponse } from 'next';
import { getNaviMarket } from '../../../../lib/defi/navi/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const data = await getNaviMarket();
  if (!data) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Navi Protocol (Sui) market data is temporarily unavailable.',
    });
  }
  if (data.pools.length === 0) {
    return res.status(503).json({
      error: 'No pool data',
      message: 'Navi Protocol (Sui) returned no pool entries — API or network failure.',
    });
  }
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  return res.status(200).json(data);
}
