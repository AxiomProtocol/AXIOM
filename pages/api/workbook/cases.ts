import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { workbookCases } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const testMode = process.env.WORKBOOK_TEST_MODE === 'true';

  if (req.method === 'GET') {
    try {
      const cases = await db.select().from(workbookCases).orderBy(workbookCases.createdAt);
      return res.status(200).json({
        success: true,
        data: cases,
      });
    } catch (error) {
      console.error('Error fetching cases:', error);
      return res.status(200).json({
        success: true,
        data: [],
      });
    }
  }

  if (req.method === 'POST') {
    if (!testMode) {
      return res.status(401).json({
        error: 'Subscription required to create cases',
      });
    }

    try {
      const { caseTitle, ancestorPrimaryName, ancestorNameVariants, jurisdictionCode } = req.body;

      if (!caseTitle || !ancestorPrimaryName) {
        return res.status(400).json({
          error: 'Case title and ancestor name are required',
        });
      }

      const [newCase] = await db.insert(workbookCases).values({
        caseTitle,
        ancestorPrimaryName,
        ancestorNameVariants: ancestorNameVariants || null,
        jurisdictionCode: jurisdictionCode || null,
        status: 'active',
      }).returning();

      return res.status(201).json({
        success: true,
        data: newCase,
      });
    } catch (error) {
      console.error('Error creating case:', error);
      return res.status(500).json({
        error: 'Failed to create case',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
