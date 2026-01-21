import type { NextApiRequest, NextApiResponse } from 'next';
import dexService from '../../../server/services/dex/DexService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Missing token address' });
    }

    const price = await dexService.getTokenPrice(token as string);

    return res.status(200).json({ 
      token,
      price: price || '0'
    });
  } catch (error) {
    console.error('Error fetching token price:', error);
    return res.status(500).json({ error: 'Failed to fetch token price' });
  }
}
