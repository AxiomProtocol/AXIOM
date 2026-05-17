import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { getAaveArbitrumUserPosition } from '../../../../lib/defi/aave/arbitrumService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const address = req.query.address as string | undefined;
  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Query parameter `address` must be a valid EVM address.',
    });
  }
  const data = await getAaveArbitrumUserPosition(address);
  if (!data) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Aave v3 Arbitrum user position data is temporarily unavailable.',
    });
  }
  res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  return res.status(200).json(data);
}
