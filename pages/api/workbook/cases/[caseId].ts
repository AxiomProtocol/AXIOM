import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { workbookCases, workbookSectionStates, evidenceItems, factClaims, taskItems } from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { checkEntitlement } from '../../../../lib/workbook/entitlements';
import { detectCollisions } from '../../../../lib/workbook/identity-collision';
import { getUserFromSiweSession } from '../../../../lib/workbook/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserFromSiweSession(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const caseId = parseInt(req.query.caseId as string);
  if (isNaN(caseId)) {
    return res.status(400).json({ error: 'Invalid case ID' });
  }

  const [caseData] = await db
    .select()
    .from(workbookCases)
    .where(and(eq(workbookCases.id, caseId), eq(workbookCases.userId, userId)))
    .limit(1);

  if (!caseData) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const entitlement = await checkEntitlement(userId);
  if (!entitlement.hasAccess) {
    return res.status(403).json({ error: 'Subscription required', requiresSubscription: true });
  }

  if (req.method === 'GET') {
    try {
      const sections = await db
        .select()
        .from(workbookSectionStates)
        .where(eq(workbookSectionStates.caseId, caseId));

      const evidence = await db
        .select()
        .from(evidenceItems)
        .where(eq(evidenceItems.caseId, caseId));

      const claims = await db
        .select()
        .from(factClaims)
        .where(eq(factClaims.caseId, caseId));

      const tasks = await db
        .select()
        .from(taskItems)
        .where(eq(taskItems.caseId, caseId));

      const collisions = await detectCollisions(caseId);

      const completedSections = sections.filter(s => s.completionStatus === 'complete').length;
      const totalSections = sections.length;
      const primarySources = evidence.filter(e => e.primaryOrSecondary === 'primary').length;
      const verifiedClaims = claims.filter(c => c.confidenceLevel === 'verified').length;
      const openTasks = tasks.filter(t => t.status === 'open').length;

      return res.status(200).json({
        success: true,
        data: {
          case: caseData,
          sections,
          stats: {
            completedSections,
            totalSections,
            evidenceCount: evidence.length,
            primarySources,
            claimsCount: claims.length,
            verifiedClaims,
            openTasks,
          },
          collisions,
        },
      });
    } catch (error) {
      console.error('Failed to fetch case details:', error);
      return res.status(500).json({ error: 'Failed to fetch case details' });
    }
  }

  if (req.method === 'PATCH') {
    const entitlement = await checkEntitlement(userId);
    if (!entitlement.isActive) {
      return res.status(403).json({ error: 'Active subscription required to update cases' });
    }

    try {
      const { caseTitle, ancestorPrimaryName, ancestorNameVariants, jurisdictionCode, status, ethicalUseAccepted } = req.body;

      const updates: Record<string, any> = { updatedAt: new Date() };

      if (caseTitle !== undefined) updates.caseTitle = caseTitle;
      if (ancestorPrimaryName !== undefined) updates.ancestorPrimaryName = ancestorPrimaryName;
      if (ancestorNameVariants !== undefined) updates.ancestorNameVariants = ancestorNameVariants;
      if (jurisdictionCode !== undefined) updates.jurisdictionCode = jurisdictionCode;
      if (status !== undefined) updates.status = status;
      if (ethicalUseAccepted === true && !caseData.ethicalUseAcceptedAt) {
        updates.ethicalUseAcceptedAt = new Date();
      }

      const [updated] = await db
        .update(workbookCases)
        .set(updates)
        .where(eq(workbookCases.id, caseId))
        .returning();

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      console.error('Failed to update case:', error);
      return res.status(500).json({ error: 'Failed to update case' });
    }
  }

  if (req.method === 'DELETE') {
    const entitlement = await checkEntitlement(userId);
    if (!entitlement.isActive) {
      return res.status(403).json({ error: 'Active subscription required to delete cases' });
    }

    try {
      await db.update(workbookCases)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(eq(workbookCases.id, caseId));

      return res.status(200).json({ success: true, message: 'Case archived' });
    } catch (error) {
      console.error('Failed to archive case:', error);
      return res.status(500).json({ error: 'Failed to archive case' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
