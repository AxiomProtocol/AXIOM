import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { stewardAssignments, stewardRegions } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  const normalizedWallet = wallet.toLowerCase();

  try {
    const assignments = await db
      .select({
        id: stewardAssignments.id,
        role: stewardAssignments.role,
        status: stewardAssignments.status,
        regionId: stewardAssignments.regionId,
        regionName: stewardRegions.name
      })
      .from(stewardAssignments)
      .leftJoin(stewardRegions, eq(stewardAssignments.regionId, stewardRegions.id))
      .where(eq(stewardAssignments.wallet, normalizedWallet))
      .limit(1)
      .catch(() => []);

    if (assignments.length === 0) {
      return res.status(200).json({
        role: null,
        regionName: null,
        regionId: null,
        status: 'none',
        hasAccess: false
      });
    }

    const assignment = assignments[0];
    const hasAccess = ['probationary', 'active'].includes(assignment.status || '');

    return res.status(200).json({
      role: assignment.role,
      regionName: assignment.regionName,
      regionId: assignment.regionId,
      status: assignment.status,
      hasAccess
    });
  } catch (error) {
    console.error('Dashboard auth error:', error);
    return res.status(200).json({
      role: null,
      regionName: null,
      regionId: null,
      status: 'none',
      hasAccess: false
    });
  }
}
