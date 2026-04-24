import { NextApiRequest, NextApiResponse } from 'next';
import { policyGuardService } from '../../../lib/services/PolicyGuardService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { walletAddress } = req.query;
    
    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    try {
      const credential = await policyGuardService.getMemberCredential(walletAddress);
      
      if (!credential) {
        return res.status(200).json({
          walletAddress: walletAddress.toLowerCase(),
          isVerified: false,
          verificationLevel: 0,
          reputationScore: 50,
          completedRotations: 0,
          defaultCount: 0,
          isNew: true
        });
      }

      return res.status(200).json({ ...credential, isNew: false });
    } catch (error) {
      console.error('Get credential error:', error);
      return res.status(500).json({ error: 'Failed to get credential' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { walletAddress, isVerified, verificationLevel, reputationScore } = req.body;

      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
      }

      await policyGuardService.createOrUpdateMemberCredential({
        walletAddress,
        isVerified,
        verificationLevel,
        reputationScore
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Update credential error:', error);
      return res.status(500).json({ error: 'Failed to update credential' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
