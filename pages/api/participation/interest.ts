import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * POST /api/participation/interest
 * Records interest in next Land Project cohort
 * 
 * TODO: Wire to on-chain contract when available
 * Currently uses off-chain placeholder storage
 */

interface InterestRecord {
  wallet: string;
  timestamp: number;
  type: 'land-cohort';
}

const interestRecords: Map<string, InterestRecord> = new Map();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet } = req.body;

    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }

    const normalizedWallet = wallet.toLowerCase();
    
    if (interestRecords.has(normalizedWallet)) {
      return res.status(200).json({ 
        success: true, 
        message: 'Interest already recorded',
        alreadyRegistered: true
      });
    }

    const record: InterestRecord = {
      wallet: normalizedWallet,
      timestamp: Date.now(),
      type: 'land-cohort'
    };

    interestRecords.set(normalizedWallet, record);

    return res.status(200).json({
      success: true,
      message: 'Interest recorded successfully',
      position: interestRecords.size
    });

  } catch (error) {
    console.error('Interest recording error:', error);
    return res.status(500).json({ error: 'Failed to record interest' });
  }
}
