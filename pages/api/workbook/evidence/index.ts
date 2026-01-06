import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { evidenceItems, workbookCases } from '../../../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { checkEntitlement } from '../../../../lib/workbook/entitlements';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = (req as any).session?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const caseId = parseInt(req.query.caseId as string);
  if (isNaN(caseId)) {
    return res.status(400).json({ error: 'Case ID is required' });
  }

  const [caseData] = await db
    .select()
    .from(workbookCases)
    .where(and(eq(workbookCases.id, caseId), eq(workbookCases.userId, userId)))
    .limit(1);

  if (!caseData) {
    return res.status(404).json({ error: 'Case not found' });
  }

  if (req.method === 'GET') {
    try {
      const evidence = await db
        .select()
        .from(evidenceItems)
        .where(eq(evidenceItems.caseId, caseId))
        .orderBy(desc(evidenceItems.createdAt));

      return res.status(200).json({ success: true, data: evidence });
    } catch (error) {
      console.error('Failed to fetch evidence:', error);
      return res.status(500).json({ error: 'Failed to fetch evidence' });
    }
  }

  if (req.method === 'POST') {
    const entitlement = await checkEntitlement(userId);
    if (!entitlement.canUpload) {
      return res.status(403).json({ error: 'Active subscription required to add evidence' });
    }

    try {
      const {
        title,
        recordType,
        primaryOrSecondary,
        confidenceLevel,
        sourceName,
        sourceLocation,
        sourceCitation,
        dateAccessed,
        yearRangeStart,
        yearRangeEnd,
        county,
        state,
        legalDescription,
        fileId,
        notes,
      } = req.body;

      if (!title || !recordType || !primaryOrSecondary || !sourceName || !dateAccessed) {
        return res.status(400).json({
          error: 'Title, record type, source type, source name, and date accessed are required',
        });
      }

      const [newEvidence] = await db
        .insert(evidenceItems)
        .values({
          caseId,
          userId,
          title,
          recordType,
          primaryOrSecondary,
          confidenceLevel: confidenceLevel || 'unsupported',
          sourceName,
          sourceLocation,
          sourceCitation,
          dateAccessed: new Date(dateAccessed),
          yearRangeStart: yearRangeStart || null,
          yearRangeEnd: yearRangeEnd || null,
          county,
          state,
          legalDescription,
          fileId,
          notes,
        })
        .returning();

      return res.status(201).json({ success: true, data: newEvidence });
    } catch (error) {
      console.error('Failed to create evidence:', error);
      return res.status(500).json({ error: 'Failed to create evidence' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
