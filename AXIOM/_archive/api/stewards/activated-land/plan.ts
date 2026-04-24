import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { activatedLandStewardshipPlans, stewardLandLeads, stewardAssignments } from '../../../../shared/schema';
import { withSIWEAuth, AuthenticatedRequest } from '../../../../lib/middleware/siweAuth';
import { eq } from 'drizzle-orm';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
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

  if (req.method === 'POST') {
    try {
      const {
        leadId,
        proposedActivities,
        seasonalCalendar,
        participantGuidelines,
        maxParticipants,
        communicationFrequency,
        accessHours,
        toolStorage,
        emergencyPlan,
        stopPauseProcedures
      } = req.body;

      if (!leadId) {
        return res.status(400).json({ error: 'leadId is required' });
      }

      const [lead] = await db.select()
        .from(stewardLandLeads)
        .where(eq(stewardLandLeads.id, leadId))
        .limit(1);

      if (!lead) {
        return res.status(404).json({ error: 'Land lead not found' });
      }

      if (lead.regionId !== steward.regionId && steward.role !== 'admin') {
        return res.status(403).json({ error: 'Cannot create plan for lead outside your region' });
      }

      const [plan] = await db.insert(activatedLandStewardshipPlans).values({
        leadId,
        proposedActivities: proposedActivities || null,
        seasonalCalendar: seasonalCalendar || null,
        participantGuidelines: participantGuidelines || null,
        maxParticipants: maxParticipants || null,
        communicationFrequency: communicationFrequency || null,
        accessHours: accessHours || null,
        toolStorage: toolStorage || null,
        emergencyPlan: emergencyPlan || null,
        stopPauseProcedures: stopPauseProcedures || null,
        status: 'draft',
        createdBy: wallet
      }).returning();

      await db.update(stewardLandLeads)
        .set({ 
          stage: 'needsData',
          metadata: {
            ...(lead.metadata as object || {}),
            activationStage: 'plan_drafted'
          },
          updatedAt: new Date()
        })
        .where(eq(stewardLandLeads.id, leadId));

      return res.status(201).json({ success: true, plan });
    } catch (error) {
      console.error('Error creating stewardship plan:', error);
      return res.status(500).json({ error: 'Failed to create plan' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { leadId } = req.query;
      
      if (!leadId) {
        return res.status(400).json({ error: 'leadId query param required' });
      }

      const plans = await db.select()
        .from(activatedLandStewardshipPlans)
        .where(eq(activatedLandStewardshipPlans.leadId, Number(leadId)));

      return res.status(200).json({ plans });
    } catch (error) {
      console.error('Error fetching stewardship plans:', error);
      return res.status(500).json({ error: 'Failed to fetch plans' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withSIWEAuth(handler);
