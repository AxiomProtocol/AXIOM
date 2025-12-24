import { NextApiRequest, NextApiResponse } from 'next';
import { policyGuardService } from '../../../lib/services/PolicyGuardService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress, poolContributionAmount, poolId } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const contributionAmount = parseFloat(poolContributionAmount) || 100;
    const result = await policyGuardService.runPolicyChecks(
      walletAddress,
      contributionAmount,
      poolId
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Policy check error:', error);
    return res.status(500).json({ error: 'Failed to run policy checks' });
  }
}
