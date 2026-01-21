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
    const stats = await dexService.getProtocolStats();
    return res.status(200).json({ stats });
  } catch (error) {
    console.error('Error fetching DEX stats:', error);
    return res.status(500).json({ error: 'Failed to fetch DEX stats' });
  }
}
