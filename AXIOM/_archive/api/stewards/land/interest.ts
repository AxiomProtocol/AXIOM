import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { stewardLandInterests, stewardLandLeads } from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet, leadId, interestLevel = 'interested', notes } = req.body;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  if (!leadId || typeof leadId !== 'number') {
    return res.status(400).json({ error: 'Lead ID required' });
  }

  const normalizedWallet = wallet.toLowerCase();

  try {
    const leads = await db
      .select()
      .from(stewardLandLeads)
      .where(eq(stewardLandLeads.id, leadId))
      .limit(1);

    if (leads.length === 0) {
      return res.status(404).json({ error: 'Land lead not found' });
    }

    const existing = await db
      .select()
      .from(stewardLandInterests)
      .where(and(
        eq(stewardLandInterests.leadId, leadId),
        eq(stewardLandInterests.wallet, normalizedWallet)
      ))
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already signaled interest in this lead' });
    }

    const [interest] = await db
      .insert(stewardLandInterests)
      .values({
        leadId,
        wallet: normalizedWallet,
        interestLevel,
        notes
      })
      .returning();

    return res.status(201).json({
      success: true,
      interestId: interest.id,
      message: 'Interest signal recorded successfully'
    });
  } catch (error) {
    console.error('Land interest error:', error);
    return res.status(500).json({ error: 'Failed to record interest' });
  }
}
