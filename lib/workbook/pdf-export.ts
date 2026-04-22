import PDFDocument from 'pdfkit';
import { pool } from '../../server/db';
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

  const caseResult = await pool.query(
    `SELECT * FROM workbook_cases WHERE id = $1 LIMIT 1`,
    [caseId]
  );
  const caseData = caseResult.rows[0];

  if (!caseData || caseData.user_id !== userId) {
    throw new Error('Case not found');
  }

  let evidence: any[] = [];
  if (options.includeEvidence !== false) {
    const evidenceResult = await pool.query(
      `SELECT * FROM evidence_items WHERE case_id = $1`,
      [caseId]
    );
    evidence = evidenceResult.rows;
  }

  let claims: any[] = [];
  if (options.includeClaims !== false) {
    const claimsResult = await pool.query(
      `SELECT * FROM fact_claims WHERE case_id = $1`,
      [caseId]
    );
    claims = claimsResult.rows;
  }

  let sections: any[] = [];
  if (options.includeSections !== false) {
    const sectionsResult = await pool.query(
      `SELECT * FROM workbook_section_states WHERE case_id = $1`,
      [caseId]
    );
    sections = sectionsResult.rows;
  }

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
      .text(`Case Title: ${caseData.case_title}`)
      .text(`Primary Ancestor: ${caseData.ancestor_primary_name}`)
      .text(`Jurisdiction: ${caseData.jurisdiction_code || 'Not specified'}`)
      .text(`Status: ${caseData.status}`)
      .text(`Created: ${new Date(caseData.created_at).toLocaleDateString()}`);

    if (caseData.ancestor_name_variants && (caseData.ancestor_name_variants as string[]).length > 0) {
      doc.text(`Name Variants: ${(caseData.ancestor_name_variants as string[]).join(', ')}`);
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
        const label = sectionLabels[s.section_key] || s.section_key;
        const statusSymbol = s.completion_status === 'complete' ? '[X]' : 
                            s.completion_status === 'in_progress' ? '[~]' : 
                            s.completion_status === 'blocked' ? '[!]' : '[ ]';
        doc.fontSize(11).text(`${statusSymbol} ${label}: ${s.completion_status.replace('_', ' ')}`);
        if (s.blocked_reason) {
          doc.fontSize(10).fillColor('#666').text(`    Blocked: ${s.blocked_reason}`);
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
        doc.text(`Type: ${e.record_type} | Source: ${e.primary_or_secondary} | Confidence: ${e.confidence_level}`);
        doc.text(`Source: ${e.source_name}`);
        if (e.source_citation) {
          doc.text(`Citation: ${e.source_citation}`);
        }
        if (e.county && e.state) {
          doc.text(`Location: ${e.county}, ${e.state}`);
        }
        if (e.year_range_start || e.year_range_end) {
          const range = e.year_range_start === e.year_range_end || !e.year_range_end
            ? `${e.year_range_start}`
            : `${e.year_range_start}-${e.year_range_end}`;
          doc.text(`Year Range: ${range}`);
        }
        doc.text(`Accessed: ${e.date_accessed ? new Date(e.date_accessed).toLocaleDateString() : 'Unknown'}`);
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
        doc.fontSize(11).font('Helvetica-Bold').text(`C${c.id}: ${c.claim_type}`);
        doc.font('Helvetica').fontSize(10);
        doc.text(c.claim_text);
        doc.text(`Confidence: ${c.confidence_level}`);
        const refs = (c.related_evidence_ids as number[]) || [];
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
