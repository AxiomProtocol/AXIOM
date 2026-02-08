import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { activatedLandOwnerChecklists, stewardLandLeads, stewardAssignments } from '../../../../../shared/schema';
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
      leadId,
      ownershipConfirmed,
      accessTermsAgreed,
      activitiesApproved,
      communicationFrequencyAgreed,
      stopConditionsUnderstood,
      insuranceAcknowledged,
      noFinancialPromisesUnderstood,
      voluntaryParticipationConfirmed
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
      return res.status(403).json({ error: 'Cannot update checklist for lead outside your region' });
    }

    const [existing] = await db.select()
      .from(activatedLandOwnerChecklists)
      .where(eq(activatedLandOwnerChecklists.leadId, leadId))
      .limit(1);

    const checklistData = {
      ownershipConfirmed: ownershipConfirmed ?? false,
      accessTermsAgreed: accessTermsAgreed ?? false,
      activitiesApproved: activitiesApproved ?? false,
      communicationFrequencyAgreed: communicationFrequencyAgreed ?? false,
      stopConditionsUnderstood: stopConditionsUnderstood ?? false,
      insuranceAcknowledged: insuranceAcknowledged ?? false,
      noFinancialPromisesUnderstood: noFinancialPromisesUnderstood ?? false,
      voluntaryParticipationConfirmed: voluntaryParticipationConfirmed ?? false,
      updatedAt: new Date()
    };

    const allChecked = Object.values(checklistData).every(v => v === true || v instanceof Date);

    if (existing) {
      const [updated] = await db.update(activatedLandOwnerChecklists)
        .set({
          ...checklistData,
          completedAt: allChecked ? new Date() : null,
          completedBy: allChecked ? wallet : null
        })
        .where(eq(activatedLandOwnerChecklists.id, existing.id))
        .returning();

      return res.status(200).json({ success: true, checklist: updated });
    } else {
      const [created] = await db.insert(activatedLandOwnerChecklists).values({
        leadId,
        ...checklistData,
        completedAt: allChecked ? new Date() : null,
        completedBy: allChecked ? wallet : null
      }).returning();

      return res.status(201).json({ success: true, checklist: created });
    }
  } catch (error) {
    console.error('Error updating owner checklist:', error);
    return res.status(500).json({ error: 'Failed to update checklist' });
  }
}

export default withSIWEAuth(handler);
