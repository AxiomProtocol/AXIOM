import { NextApiRequest, NextApiResponse } from 'next';
import { getUserSeedPosition } from '../../../lib/server/v2ContractService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ 
      success: false, 
      error: 'Address parameter is required' 
    });
  }

  try {
    const position = await getUserSeedPosition(address);
    
    return res.status(200).json({
      success: true,
      address,
      votingPower: position.votingPower,
      lockedAmount: position.lockedAmount,
      unlockTime: position.unlockTime,
      lockStart: position.lockStart,
      claimableRewards: position.claimableRewards
    });
  } catch (error: any) {
    console.error('Error fetching SEED balance:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch SEED balance'
    });
  }
}
