import type { NextApiRequest, NextApiResponse } from 'next';
import { susuService } from '../../../../lib/services/SusuService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const poolId = parseInt(id as string);
    
    if (isNaN(poolId) || poolId < 1) {
      return res.status(400).json({ error: 'Invalid pool ID' });
    }

    const pool = await susuService.getPool(poolId);
    
    if (!pool) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    const [members, payoutOrder, cycleInfo, expectedPayout] = await Promise.all([
      susuService.getPoolMembers(poolId),
      susuService.getPayoutOrder(poolId),
      susuService.getCycleInfo(poolId),
      susuService.getExpectedPayout(poolId)
    ]);

    let currentRecipient = null;
    if (pool.status === 1 && pool.currentCycle > 0) {
      currentRecipient = await susuService.getCurrentRecipient(poolId);
    }

    res.status(200).json({
      success: true,
      pool,
      members,
      payoutOrder,
      cycleInfo,
      expectedPayout,
      currentRecipient
    });
  } catch (error) {
    console.error('Error fetching pool details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch pool details'
    });
  }
}
