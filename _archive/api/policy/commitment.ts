import { NextApiRequest, NextApiResponse } from 'next';
import { policyGuardService } from '../../../lib/services/PolicyGuardService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress, poolId, rotationCount } = req.body;

    if (!walletAddress || !poolId) {
      return res.status(400).json({ error: 'Wallet address and pool ID are required' });
    }

    await policyGuardService.signCommitment(
      walletAddress,
      poolId,
      rotationCount || 2
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Sign commitment error:', error);
    return res.status(500).json({ error: 'Failed to sign commitment' });
  }
}
