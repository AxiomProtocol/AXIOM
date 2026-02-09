import type { NextApiRequest, NextApiResponse } from 'next';
import camelotPoolService from '../../../lib/services/CamelotPoolService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const poolData = await camelotPoolService.getAllPools();
    
    const totalTVL = poolData.reduce((sum, pool) => sum + pool.tvl, 0);
    const totalVolume24h = poolData.reduce((sum, pool) => sum + pool.volume24h, 0);
    const totalFees24h = poolData.reduce((sum, pool) => sum + pool.fees24h, 0);
    
    return res.status(200).json({
      totalPools: poolData.length,
      totalTVL: totalTVL.toString(),
      totalVolume24h: totalVolume24h.toString(),
      totalFees24h: totalFees24h.toString(),
      source: 'camelot'
    });
  } catch (error) {
    console.error('Error getting protocol stats:', error);
    return res.status(500).json({ 
      totalPools: 0,
      totalTVL: '0',
      totalVolume24h: '0',
      totalFees24h: '0',
      error: 'Failed to fetch stats'
    });
  }
}
