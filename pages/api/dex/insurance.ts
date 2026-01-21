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
    const stats = await dexService.getInsuranceFundStats();
    return res.status(200).json({ stats });
  } catch (error) {
    console.error('Error fetching insurance fund data:', error);
    return res.status(500).json({ error: 'Failed to fetch insurance fund data' });
  }
}
