import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { workbookCases, workbookSectionStates } from '../../../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { checkEntitlement } from '../../../../lib/workbook/entitlements';
import { getUserFromSiweSession } from '../../../../lib/workbook/auth';

const SECTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'Courthouse', 'Legal', 'Checklist', 'Exports'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserFromSiweSession(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const entitlement = await checkEntitlement(userId);
  if (!entitlement.hasAccess) {
    return res.status(403).json({ error: 'Subscription required', requiresSubscription: true });
  }

  if (req.method === 'GET') {
    try {
      const cases = await db
        .select()
        .from(workbookCases)
        .where(eq(workbookCases.userId, userId))
        .orderBy(desc(workbookCases.updatedAt));

      return res.status(200).json({ success: true, data: cases });
    } catch (error) {
      console.error('Failed to fetch cases:', error);
      return res.status(500).json({ error: 'Failed to fetch cases' });
    }
  }

  if (req.method === 'POST') {
    if (!entitlement.canCreate) {
      return res.status(403).json({ error: 'Active subscription required to create cases' });
    }

    try {
      const { caseTitle, ancestorPrimaryName, ancestorNameVariants, jurisdictionCode } = req.body;

      if (!caseTitle || !ancestorPrimaryName) {
        return res.status(400).json({ error: 'Case title and ancestor name are required' });
      }

      const [newCase] = await db
        .insert(workbookCases)
        .values({
          userId,
          caseTitle,
          ancestorPrimaryName,
          ancestorNameVariants: ancestorNameVariants || [],
          jurisdictionCode: jurisdictionCode || null,
        })
        .returning();

      const sectionStates = SECTION_KEYS.map(key => ({
        caseId: newCase.id,
        sectionKey: key,
        completionStatus: 'not_started' as const,
      }));

      await db.insert(workbookSectionStates).values(sectionStates);

      return res.status(201).json({ success: true, data: newCase });
    } catch (error) {
      console.error('Failed to create case:', error);
      return res.status(500).json({ error: 'Failed to create case' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
