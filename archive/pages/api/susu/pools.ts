import type { NextApiRequest, NextApiResponse } from 'next';
import { susuService, PoolStatus } from '../../../lib/services/SusuService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status, limit = '50' } = req.query;
    
    const pools = await susuService.getAllPools(parseInt(limit as string));
    
    let filteredPools = pools;
    if (status && status !== 'all') {
      const statusMap: { [key: string]: PoolStatus } = {
        'pending': PoolStatus.Pending,
        'active': PoolStatus.Active,
        'completed': PoolStatus.Completed,
        'cancelled': PoolStatus.Cancelled
      };
      const targetStatus = statusMap[status as string];
      if (targetStatus !== undefined) {
        filteredPools = pools.filter(p => p.status === targetStatus);
      }
    }

    const totalPools = await susuService.getTotalPools();
    const defaultParams = await susuService.getDefaultParams();

    res.status(200).json({
      success: true,
      pools: filteredPools,
      totalPools,
      defaultParams,
      contractAddress: susuService.getContractAddress()
    });
  } catch (error) {
    console.error('Error fetching SUSU pools:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch pools',
      pools: []
    });
  }
}
