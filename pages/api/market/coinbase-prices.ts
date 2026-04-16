import type { NextApiRequest, NextApiResponse } from 'next';
import { getSpotPrices, CoinbasePricesResult } from '../../../lib/market/coinbaseMarketService';

const DEFAULT_PAIRS = ['ETH-USD', 'BTC-USD', 'USDC-USD', 'SOL-USD'];

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CoinbasePricesResult | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawPairs = req.query.pairs as string | undefined;
  const pairs = rawPairs
    ? rawPairs.split(',').map(p => p.trim().toUpperCase()).filter(Boolean)
    : DEFAULT_PAIRS;

  try {
    const result = await getSpotPrices(pairs);
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return res.status(200).json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch prices';
    return res.status(500).json({ error: msg });
  }
}
