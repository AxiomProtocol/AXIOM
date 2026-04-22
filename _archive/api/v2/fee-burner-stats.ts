import type { NextApiRequest, NextApiResponse } from 'next';
import { getFeeBurnerStats } from '../../../lib/server/v2ContractService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stats = await getFeeBurnerStats();
    
    return res.status(200).json({
      success: true,
      ...stats
    });
  } catch (error: any) {
    console.error('Error fetching fee burner stats:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch fee burner stats'
    });
  }
}
