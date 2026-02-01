import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { landownerApplications, stewardAssignments } from '../../../shared/schema';
import { withSIWEAuth, AuthenticatedRequest } from '../../../lib/middleware/siweAuth';
import { eq, desc } from 'drizzle-orm';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const wallet = req.siweSession?.address?.toLowerCase();
    if (!wallet) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [steward] = await db.select()
      .from(stewardAssignments)
      .where(eq(stewardAssignments.wallet, wallet))
      .limit(1);

    if (!steward || steward.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const applications = await db.select()
      .from(landownerApplications)
      .orderBy(desc(landownerApplications.createdAt));

    return res.status(200).json({ applications });
  } catch (error) {
    console.error('Error fetching landowner applications:', error);
    return res.status(500).json({ error: 'Failed to fetch applications' });
  }
}

export default withSIWEAuth(handler);
