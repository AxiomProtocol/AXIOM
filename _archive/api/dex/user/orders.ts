import type { NextApiRequest, NextApiResponse } from 'next';
import dexService from '../../../../server/services/dex/DexService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Missing wallet address' });
    }

    const orders = await dexService.getUserLimitOrders(address as string);

    return res.status(200).json({ 
      orders,
      count: orders.length 
    });
  } catch (error) {
    console.error('Error fetching limit orders:', error);
    return res.status(500).json({ error: 'Failed to fetch limit orders' });
  }
}
