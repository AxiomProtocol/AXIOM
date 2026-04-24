import { NextApiRequest, NextApiResponse } from 'next';
import { policyGuardService } from '../../../lib/services/PolicyGuardService';
import { db } from '../../../server/db';
import { reputationEvents } from '../../../shared/schema';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { walletAddress, limit } = req.query;
    
    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    try {
      const events = await db
        .select()
        .from(reputationEvents)
        .where(eq(reputationEvents.walletAddress, walletAddress.toLowerCase()))
        .orderBy(desc(reputationEvents.createdAt))
        .limit(parseInt(limit as string) || 20);

      const score = await policyGuardService.getReputationScore(walletAddress);

      return res.status(200).json({
        score,
        events
      });
    } catch (error) {
      console.error('Get reputation error:', error);
      return res.status(500).json({ error: 'Failed to get reputation' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { walletAddress, eventType, severity, details } = req.body;

      if (!walletAddress || !eventType || !severity) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      await policyGuardService.recordReputationEvent(
        walletAddress,
        eventType,
        severity,
        details || {}
      );

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Record reputation event error:', error);
      return res.status(500).json({ error: 'Failed to record reputation event' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
