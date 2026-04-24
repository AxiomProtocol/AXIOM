import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserVeAXMPosition, getVeAXMStats } from '../../../lib/server/v2ContractService';
import { ethers } from 'ethers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;
  
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address is required' });
  }

  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid address format' });
  }

  try {
    const [position, globalStats] = await Promise.all([
      getUserVeAXMPosition(address),
      getVeAXMStats()
    ]);
    
    return res.status(200).json({
      success: true,
      position,
      globalStats
    });
  } catch (error: any) {
    console.error('Error fetching veAXM rewards:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch veAXM rewards'
    });
  }
}
