import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { activatedLandCycles, activatedLandStewardshipPlans, stewardLandLeads, stewardAssignments } from '../../../../../shared/schema';
import { withSIWEAuth, AuthenticatedRequest } from '../../../../../lib/middleware/siweAuth';
import { eq, and } from 'drizzle-orm';

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

  if (!steward || !['active', 'admin'].includes(steward.status || '')) {
    return res.status(403).json({ error: 'Active steward status required' });
  }

  try {
    const { leadId, planId, startDate } = req.body;

    if (!leadId || !startDate) {
      return res.status(400).json({ error: 'leadId and startDate are required' });
    }

    const [lead] = await db.select()
      .from(stewardLandLeads)
      .where(eq(stewardLandLeads.id, leadId))
      .limit(1);

    if (!lead) {
      return res.status(404).json({ error: 'Land lead not found' });
    }

    if (lead.regionId !== steward.regionId && steward.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot open cycle for lead outside your region' });
    }

    const existingCycles = await db.select()
      .from(activatedLandCycles)
      .where(and(
        eq(activatedLandCycles.leadId, leadId),
        eq(activatedLandCycles.status, 'active')
      ));

    if (existingCycles.length > 0) {
      return res.status(400).json({ error: 'An active cycle already exists for this lead' });
    }

    const cycleCount = await db.select()
      .from(activatedLandCycles)
      .where(eq(activatedLandCycles.leadId, leadId));

    const [cycle] = await db.insert(activatedLandCycles).values({
      leadId,
      planId: planId || null,
      cycleNumber: cycleCount.length + 1,
      startDate: new Date(startDate),
      status: 'active'
    }).returning();

    await db.update(stewardLandLeads)
      .set({ 
        stage: 'qualified',
        metadata: {
          ...(lead.metadata as object || {}),
          activationStage: 'active_cycle'
        },
        updatedAt: new Date()
      })
      .where(eq(stewardLandLeads.id, leadId));

    return res.status(201).json({ success: true, cycle });
  } catch (error) {
    console.error('Error opening activation cycle:', error);
    return res.status(500).json({ error: 'Failed to open cycle' });
  }
}

export default withSIWEAuth(handler);
