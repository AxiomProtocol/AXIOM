import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { stewardCohorts } from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet, cohortId, cohortName } = req.body;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  if (!cohortId || typeof cohortId !== 'string') {
    return res.status(400).json({ error: 'Cohort ID required' });
  }

  const normalizedWallet = wallet.toLowerCase();

  try {
    const existing = await db
      .select()
      .from(stewardCohorts)
      .where(and(
        eq(stewardCohorts.cohortId, cohortId),
        eq(stewardCohorts.walletAddress, normalizedWallet)
      ))
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this cohort' });
    }

    const [enrollment] = await db
      .insert(stewardCohorts)
      .values({
        walletAddress: normalizedWallet,
        cohortId,
        cohortName: cohortName || `Cohort ${cohortId}`,
        status: 'enrolled'
      })
      .returning();

    return res.status(201).json({
      success: true,
      enrollmentId: enrollment.id,
      message: 'Successfully joined cohort waitlist'
    });
  } catch (error) {
    console.error('Cohort join error:', error);
    return res.status(500).json({ error: 'Failed to join cohort' });
  }
}
