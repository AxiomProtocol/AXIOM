import type { NextApiRequest, NextApiResponse } from 'next';
import { susuService } from '../../../../lib/services/SusuService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.query;
    
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const poolIds = await susuService.getUserPools(address);
    
    const userPools = await Promise.all(
      poolIds.map(async (poolId) => {
        const pool = await susuService.getPool(poolId);
        const member = await susuService.getMember(poolId, address);
        const hasContributed = pool?.status === 1 
          ? await susuService.hasContributed(poolId, address)
          : false;
        
        return {
          pool,
          member,
          hasContributedThisCycle: hasContributed
        };
      })
    );

    res.status(200).json({
      success: true,
      userPools: userPools.filter(p => p.pool !== null),
      totalPools: poolIds.length
    });
  } catch (error) {
    console.error('Error fetching user pools:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user pools',
      userPools: []
    });
  }
}
