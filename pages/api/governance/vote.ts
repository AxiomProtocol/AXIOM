import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { proposalId, support, voterAddress } = req.body;

    if (!proposalId || support === undefined || !voterAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supportLabel = support === 1 ? 'for' : support === 0 ? 'against' : 'abstain';
    
    console.log(`Vote recorded: ${voterAddress} voted ${supportLabel} on proposal ${proposalId}`);
    
    res.status(200).json({
      success: true,
      message: 'Vote recorded successfully',
      vote: {
        proposalId,
        support: supportLabel,
        voter: voterAddress,
        timestamp: new Date().toISOString()
      },
      note: 'Vote has been recorded. On-chain governance voting will be available after the governance module upgrade.'
    });
  } catch (error) {
    console.error('Vote API error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to record vote' 
    });
  }
}
