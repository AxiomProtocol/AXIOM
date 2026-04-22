import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { 
  stewardAssignments, 
  stewardRegions,
  stewardDrops,
  stewardReservations,
  stewardTasks,
  stewardParticipants,
  stewardLandLeads
} from '../../../../shared/schema';
import { eq, and, gte, lte, count, sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;

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

    const assignment = assignments[0];
    const regionId = assignment.regionId;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [nextDropResult, tasksResult, participantsResult, landLeadsResult, alertsResult] = await Promise.all([
      regionId ? db
        .select()
        .from(stewardDrops)
        .where(and(
          eq(stewardDrops.regionId, regionId),
          gte(stewardDrops.date, now),
          eq(stewardDrops.status, 'published')
        ))
        .orderBy(stewardDrops.date)
        .limit(1)
        .catch(() => []) : Promise.resolve([]),
      
      regionId ? db
        .select({
          due: sql<number>`COUNT(*) FILTER (WHERE status = 'pending' AND due_at >= ${now})`.as('due'),
          overdue: sql<number>`COUNT(*) FILTER (WHERE status = 'pending' AND due_at < ${now})`.as('overdue')
        })
        .from(stewardTasks)
        .where(eq(stewardTasks.regionId, regionId))
        .catch(() => [{ due: 0, overdue: 0 }]) : Promise.resolve([{ due: 0, overdue: 0 }]),
      
      db
        .select({
          total: count(),
          newThisWeek: sql<number>`COUNT(*) FILTER (WHERE join_date >= ${weekAgo})`.as('new')
        })
        .from(stewardParticipants)
        .catch(() => [{ total: 0, newThisWeek: 0 }]),
      
      regionId ? db
        .select({
          total: count(),
          qualified: sql<number>`COUNT(*) FILTER (WHERE stage = 'qualified')`.as('qualified')
        })
        .from(stewardLandLeads)
        .where(eq(stewardLandLeads.regionId, regionId))
        .catch(() => [{ total: 0, qualified: 0 }]) : Promise.resolve([{ total: 0, qualified: 0 }]),
      
      Promise.resolve([])
    ]);

    const nextDrop = nextDropResult[0];
    let nextDropData = null;
    
    if (nextDrop) {
      const reservations = await db
        .select({ count: count() })
        .from(stewardReservations)
        .where(eq(stewardReservations.dropId, nextDrop.id))
        .catch(() => [{ count: 0 }]);

      nextDropData = {
        date: new Date(nextDrop.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        reservations: reservations[0]?.count || 0,
        capacity: nextDrop.capacity || 50
      };
    }

    const alerts = [];
    const taskData = tasksResult[0] || { due: 0, overdue: 0 };
    
    if (taskData.overdue > 0) {
      alerts.push({
        id: 'overdue-tasks',
        type: 'warning' as const,
        message: `You have ${taskData.overdue} overdue task(s)`,
        action: { label: 'View Tasks', href: '/stewards/dashboard/tasks' }
      });
    }

    return res.status(200).json({
      region: {
        id: regionId,
        name: assignment.regionId ? 'Your Region' : 'Unassigned',
        status: 'onTrack'
      },
      metrics: {
        nextDrop: nextDropData,
        openTasks: {
          due: Number(taskData.due) || 0,
          overdue: Number(taskData.overdue) || 0
        },
        participants: {
          total: Number(participantsResult[0]?.total) || 0,
          newThisWeek: Number(participantsResult[0]?.newThisWeek) || 0
        },
        landLeads: {
          total: Number(landLeadsResult[0]?.total) || 0,
          qualified: Number(landLeadsResult[0]?.qualified) || 0
        }
      },
      alerts,
      stewardStatus: assignment.status,
      stewardRole: assignment.role
    });
  } catch (error) {
    console.error('Overview error:', error);
    return res.status(500).json({ error: 'Failed to load overview data' });
  }
}
