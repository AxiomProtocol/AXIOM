import type { NextApiRequest, NextApiResponse } from 'next';
import { getUniswapV3PolygonPools } from '../../../lib/defi/uniswap/polygonService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const data = await getUniswapV3PolygonPools();
  if (!data) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Uniswap v3 Polygon pool data is temporarily unavailable.',
    });
  }
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  return res.status(200).json(data);
}
