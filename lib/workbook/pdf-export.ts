import PDFDocument from 'pdfkit';
import { db } from '../../server/db';
import { workbookCases, evidenceItems, factClaims, workbookSectionStates } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { incrementExportsGenerated } from './usage-meter';

interface ExportOptions {
  includeEvidence?: boolean;
  includeClaims?: boolean;
  includeAssumptions?: boolean;
  includeSections?: boolean;
}

export async function generateDossierPDF(
  caseId: number,
  userId: number,
  options: ExportOptions = {}
): Promise<Buffer> {
  const canProceed = await incrementExportsGenerated(userId);
  if (!canProceed) {
    throw new Error('Monthly export limit reached');
  }

  const [caseData] = await db
    .select()
    .from(workbookCases)
    .where(eq(workbookCases.id, caseId))
    .limit(1);

  if (!caseData || caseData.userId !== userId) {
    throw new Error('Case not found');
  }

  const evidence = options.includeEvidence !== false
    ? await db.select().from(evidenceItems).where(eq(evidenceItems.caseId, caseId))
    : [];

  const claims = options.includeClaims !== false
    ? await db.select().from(factClaims).where(eq(factClaims.caseId, caseId))
    : [];

  const sections = options.includeSections !== false
    ? await db.select().from(workbookSectionStates).where(eq(workbookSectionStates.caseId, caseId))
    : [];

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'LETTER', margin: 72 });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(24).text('Land Reclamation Research Dossier', { align: 'center' });
    doc.moveDown();

    doc.fontSize(10).fillColor('#666')
      .text('CONFIDENTIAL - NOT LEGAL ADVICE', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(14).fillColor('#000').text('Case Information');
    doc.moveDown(0.5);
    doc.fontSize(11)
      .text(`Case Title: ${caseData.caseTitle}`)
      .text(`Primary Ancestor: ${caseData.ancestorPrimaryName}`)
      .text(`Jurisdiction: ${caseData.jurisdictionCode || 'Not specified'}`)
      .text(`Status: ${caseData.status}`)
      .text(`Created: ${caseData.createdAt.toLocaleDateString()}`);

    if (caseData.ancestorNameVariants && (caseData.ancestorNameVariants as string[]).length > 0) {
      doc.text(`Name Variants: ${(caseData.ancestorNameVariants as string[]).join(', ')}`);
    }
    doc.moveDown(2);

    doc.fontSize(8).fillColor('#999')
      .text('DISCLAIMER: This document is for research organization purposes only. It does not constitute legal advice, establish legal entitlement, or verify ownership claims. Consult qualified legal counsel before taking any legal action.', {
        align: 'justify',
        width: 468,
      });
    doc.moveDown(2);

    if (sections.length > 0) {
      doc.addPage();
      doc.fontSize(14).fillColor('#000').text('Section Progress');
      doc.moveDown();

      const sectionLabels: Record<string, string> = {
        A: 'Ancestor Identification',
        B: 'Land Records',
        C: 'Census & Tax Records',
        D: 'Probate & Succession',
        E: 'Chain of Title',
        Courthouse: 'Courthouse Planning',
        Legal: 'Legal Consultation',
        Checklist: 'Final Checklist',
        Exports: 'Exports',
      };

      sections.forEach(s => {
        const label = sectionLabels[s.sectionKey] || s.sectionKey;
        const statusSymbol = s.completionStatus === 'complete' ? '[X]' : 
                            s.completionStatus === 'in_progress' ? '[~]' : 
                            s.completionStatus === 'blocked' ? '[!]' : '[ ]';
        doc.fontSize(11).text(`${statusSymbol} ${label}: ${s.completionStatus.replace('_', ' ')}`);
        if (s.blockedReason) {
          doc.fontSize(10).fillColor('#666').text(`    Blocked: ${s.blockedReason}`);
          doc.fillColor('#000');
        }
      });
    }

    if (evidence.length > 0) {
      doc.addPage();
      doc.fontSize(14).text('Evidence Items');
      doc.moveDown();

      evidence.forEach((e, i) => {
        doc.fontSize(11).font('Helvetica-Bold').text(`E${e.id}: ${e.title}`);
        doc.font('Helvetica').fontSize(10);
        doc.text(`Type: ${e.recordType} | Source: ${e.primaryOrSecondary} | Confidence: ${e.confidenceLevel}`);
        doc.text(`Source: ${e.sourceName}`);
        if (e.sourceCitation) {
          doc.text(`Citation: ${e.sourceCitation}`);
        }
        if (e.county && e.state) {
          doc.text(`Location: ${e.county}, ${e.state}`);
        }
        if (e.yearRangeStart || e.yearRangeEnd) {
          const range = e.yearRangeStart === e.yearRangeEnd || !e.yearRangeEnd
            ? `${e.yearRangeStart}`
            : `${e.yearRangeStart}-${e.yearRangeEnd}`;
          doc.text(`Year Range: ${range}`);
        }
        doc.text(`Accessed: ${e.dateAccessed?.toLocaleDateString() || 'Unknown'}`);
        if (e.notes) {
          doc.text(`Notes: ${e.notes}`);
        }
        doc.moveDown();
      });
    }

    if (claims.length > 0) {
      doc.addPage();
      doc.fontSize(14).text('Fact Claims');
      doc.moveDown();

      claims.forEach((c, i) => {
        doc.fontSize(11).font('Helvetica-Bold').text(`C${c.id}: ${c.claimType}`);
        doc.font('Helvetica').fontSize(10);
        doc.text(c.claimText);
        doc.text(`Confidence: ${c.confidenceLevel}`);
        const refs = (c.relatedEvidenceIds as number[]) || [];
        if (refs.length > 0) {
          doc.text(`Supported by: E${refs.join(', E')}`);
        }
        doc.moveDown();
      });
    }

    const now = new Date();
    doc.addPage();
    doc.fontSize(10).fillColor('#666');
    doc.text(`Generated: ${now.toLocaleString()}`);
    doc.text('This document was generated by the Land Reclamation Workbook tool.');
    doc.moveDown();
    doc.text('REMINDER: This is a research organization tool only. No legal advice or entitlement claims are made or implied.');

    doc.end();
  });
}

export async function generateEvidenceSummaryPDF(caseId: number, userId: number): Promise<Buffer> {
  return generateDossierPDF(caseId, userId, {
    includeEvidence: true,
    includeClaims: false,
    includeAssumptions: false,
    includeSections: false,
  });
}

export async function generateChecklistPDF(caseId: number, userId: number): Promise<Buffer> {
  return generateDossierPDF(caseId, userId, {
    includeEvidence: false,
    includeClaims: false,
    includeAssumptions: false,
    includeSections: true,
  });
}
