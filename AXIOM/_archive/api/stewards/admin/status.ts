import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { 
  stewardAssignments, 
  stewardRegions,
  stewardDrops,
  stewardReservations,
  stewardParticipants,
  stewardLandLeads,
  stewardTasks
} from '../../../../shared/schema';
import { count, eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { adminSecret } = req.query;

  const expectedSecret = process.env.ADMIN_SETUP_SECRET;
  if (!expectedSecret || adminSecret !== expectedSecret) {
    return res.status(403).json({ error: 'Invalid admin secret' });
  }

  try {
    const [
      regionsResult,
      stewardsResult,
      dropsResult,
      reservationsResult,
      participantsResult,
      landLeadsResult,
      tasksResult
    ] = await Promise.all([
      db.select({ count: count() }).from(stewardRegions).catch(() => [{ count: 0 }]),
      db.select({ count: count() }).from(stewardAssignments).catch(() => [{ count: 0 }]),
      db.select({ count: count() }).from(stewardDrops).catch(() => [{ count: 0 }]),
      db.select({ count: count() }).from(stewardReservations).catch(() => [{ count: 0 }]),
      db.select({ count: count() }).from(stewardParticipants).catch(() => [{ count: 0 }]),
      db.select({ count: count() }).from(stewardLandLeads).catch(() => [{ count: 0 }]),
      db.select({ count: count() }).from(stewardTasks).catch(() => [{ count: 0 }])
    ]);

    const activeStewrds = await db
      .select()
      .from(stewardAssignments)
      .where(eq(stewardAssignments.status, 'active'))
      .catch(() => []);

    const regions = await db
      .select()
      .from(stewardRegions)
      .catch(() => []);

    return res.status(200).json({
      status: 'operational',
      tables: {
        regions: regionsResult[0]?.count || 0,
        stewards: stewardsResult[0]?.count || 0,
        drops: dropsResult[0]?.count || 0,
        reservations: reservationsResult[0]?.count || 0,
        participants: participantsResult[0]?.count || 0,
        landLeads: landLeadsResult[0]?.count || 0,
        tasks: tasksResult[0]?.count || 0
      },
      activeStewrds: activeStewrds.map(s => ({
        wallet: s.wallet,
        role: s.role,
        status: s.status,
        regionId: s.regionId
      })),
      regions: regions.map(r => ({
        id: r.id,
        name: r.name,
        status: r.status
      }))
    });
  } catch (error) {
    console.error('Admin status error:', error);
    return res.status(500).json({ error: 'Failed to get status' });
  }
}
