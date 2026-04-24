import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { activatedLandWeeklyLogs, activatedLandCycles, stewardAssignments } from '../../../../../shared/schema';
import { withSIWEAuth, AuthenticatedRequest } from '../../../../../lib/middleware/siweAuth';
import { eq } from 'drizzle-orm';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wallet = req.siweSession?.address?.toLowerCase();
  if (!wallet) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const [steward] = await db.select()
    .from(stewardAssignments)
    .where(eq(stewardAssignments.wallet, wallet))
    .limit(1);

  if (!steward || !['active', 'probationary', 'admin'].includes(steward.status || '')) {
    return res.status(403).json({ error: 'Active steward status required' });
  }

  try {
    const {
      cycleId,
      weekStart,
      activitiesCompleted,
      participantAttendance,
      photos,
      issuesEncountered,
      ownerCommunication,
      nextWeekPlanned
    } = req.body;

    if (!cycleId || !weekStart) {
      return res.status(400).json({ error: 'cycleId and weekStart are required' });
    }

    const [cycle] = await db.select()
      .from(activatedLandCycles)
      .where(eq(activatedLandCycles.id, cycleId))
      .limit(1);

    if (!cycle) {
      return res.status(404).json({ error: 'Activation cycle not found' });
    }

    if (cycle.status !== 'active') {
      return res.status(400).json({ error: 'Cannot log to inactive cycle' });
    }

    const [log] = await db.insert(activatedLandWeeklyLogs).values({
      cycleId,
      weekStart: new Date(weekStart),
      activitiesCompleted: activitiesCompleted || null,
      participantAttendance: participantAttendance || null,
      photos: photos || null,
      issuesEncountered: issuesEncountered || null,
      ownerCommunication: ownerCommunication || null,
      nextWeekPlanned: nextWeekPlanned || null,
      submittedBy: wallet
    }).returning();

    return res.status(201).json({ success: true, log });
  } catch (error) {
    console.error('Error submitting weekly log:', error);
    return res.status(500).json({ error: 'Failed to submit log' });
  }
}

export default withSIWEAuth(handler);
