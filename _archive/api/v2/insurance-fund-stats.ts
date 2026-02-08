import type { NextApiRequest, NextApiResponse } from 'next';
import { getInsuranceFundStats, getInsuranceCoverageCapacity } from '../../../lib/server/v2ContractService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [stats, capacity] = await Promise.all([
      getInsuranceFundStats(),
      getInsuranceCoverageCapacity()
    ]);
    
    return res.status(200).json({
      success: true,
      ...stats,
      coverageCapacity: capacity
    });
  } catch (error: any) {
    console.error('Error fetching insurance fund stats:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch insurance fund stats'
    });
  }
}
