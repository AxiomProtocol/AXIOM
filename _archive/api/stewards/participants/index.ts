import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { stewardParticipants, stewardAssignments } from '../../../../shared/schema';
import { eq, desc, like, or } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet, search, limit = '50', offset = '0' } = req.query;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  try {
    const assignments = await db
      .select()
      .from(stewardAssignments)
      .where(eq(stewardAssignments.wallet, wallet.toLowerCase()))
      .limit(1)
      .catch(() => []);

    if (assignments.length === 0) {
      return res.status(403).json({ error: 'Not a steward' });
    }

    const participants = await db
      .select()
      .from(stewardParticipants)
      .orderBy(desc(stewardParticipants.joinDate))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))
      .catch(() => []);

    return res.status(200).json({ participants });
  } catch (error) {
    console.error('Participants fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch participants' });
  }
}
