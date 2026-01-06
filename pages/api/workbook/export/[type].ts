import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { workbookCases } from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { checkEntitlement } from '../../../../lib/workbook/entitlements';
import { generateDossierPDF, generateEvidenceSummaryPDF, generateChecklistPDF } from '../../../../lib/workbook/pdf-export';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = (req as any).session?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { type, caseId } = req.query;
  const parsedCaseId = parseInt(caseId as string);

  if (isNaN(parsedCaseId)) {
    return res.status(400).json({ error: 'Invalid case ID' });
  }

  const entitlement = await checkEntitlement(userId);
  if (!entitlement.canExport) {
    return res.status(403).json({ error: 'Subscription required for exports' });
  }

  const [caseData] = await db
    .select()
    .from(workbookCases)
    .where(and(eq(workbookCases.id, parsedCaseId), eq(workbookCases.userId, userId)))
    .limit(1);

  if (!caseData) {
    return res.status(404).json({ error: 'Case not found' });
  }

  try {
    let pdfBuffer: Buffer;
    let filename: string;

    switch (type) {
      case 'dossier':
        pdfBuffer = await generateDossierPDF(parsedCaseId, userId);
        filename = `${caseData.caseTitle.replace(/[^a-z0-9]/gi, '_')}_Dossier.pdf`;
        break;
      case 'evidence':
        pdfBuffer = await generateEvidenceSummaryPDF(parsedCaseId, userId);
        filename = `${caseData.caseTitle.replace(/[^a-z0-9]/gi, '_')}_Evidence.pdf`;
        break;
      case 'checklist':
        pdfBuffer = await generateChecklistPDF(parsedCaseId, userId);
        filename = `${caseData.caseTitle.replace(/[^a-z0-9]/gi, '_')}_Checklist.pdf`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Export failed:', error);
    if (error instanceof Error && error.message.includes('limit')) {
      return res.status(429).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Export failed' });
  }
}
