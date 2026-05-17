import type { NextApiRequest, NextApiResponse } from 'next';
import { getAaveArbitrumMarket } from '../../../../lib/defi/aave/arbitrumService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const data = await getAaveArbitrumMarket();
  if (!data) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Aave v3 Arbitrum market data is temporarily unavailable.',
    });
  }
  if (data.markets.length === 0) {
    return res.status(503).json({
      error: 'No market data',
      message: 'Aave v3 Arbitrum returned no market entries — RPC or contract read failure.',
    });
  }
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  return res.status(200).json(data);
}
