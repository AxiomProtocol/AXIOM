import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import PDFDocument from 'pdfkit';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const candidateId = parseInt(id as string);

  if (isNaN(candidateId)) {
    return res.status(400).json({ success: false, error: 'Invalid candidate ID' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const candidateResult = await pool.query(
      'SELECT * FROM land_candidates WHERE id = $1',
      [candidateId]
    );

    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Land candidate not found' });
    }

    const candidate = candidateResult.rows[0];

    const checklistResult = await pool.query(
      'SELECT * FROM land_checklist_items WHERE land_candidate_id = $1 ORDER BY sort_order',
      [candidateId]
    );

    const historyResult = await pool.query(
      'SELECT * FROM land_history WHERE land_candidate_id = $1 ORDER BY created_at DESC LIMIT 20',
      [candidateId]
    );

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="land-candidate-${candidateId}-summary.pdf"`);
    
    doc.pipe(res);

    doc.fontSize(24).font('Helvetica-Bold').text('AXIOM Land Candidate Summary', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#ccc');
    doc.moveDown(1);

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#000').text(candidate.name || 'Unnamed Property');
    doc.moveDown(0.5);

    const stageLabels: Record<string, string> = {
      candidate: 'Candidate',
      under_review: 'Under Review',
      due_diligence: 'Due Diligence',
      ready_for_vote: 'Ready for Vote',
      approved_for_execution: 'Approved for Execution',
      acquired: 'Acquired',
      archived: 'Archived'
    };

    doc.fontSize(12).font('Helvetica-Bold').text('Current Stage: ', { continued: true });
    doc.font('Helvetica').text(stageLabels[candidate.stage] || candidate.stage);
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('Property Details');
    doc.moveDown(0.5);
    
    const details = [
      ['Location', candidate.location || 'N/A'],
      ['County', candidate.county || 'N/A'],
      ['State', candidate.state || 'N/A'],
      ['Acreage', candidate.acreage ? `${candidate.acreage} acres` : 'N/A'],
      ['Property Type', candidate.property_type || 'N/A'],
      ['Asking Price', candidate.asking_price ? `$${Number(candidate.asking_price).toLocaleString()}` : 'TBD'],
      ['Parcel Number', candidate.parcel_number || 'N/A'],
      ['Zoning', candidate.zoning || 'N/A'],
    ];

    details.forEach(([label, value]) => {
      doc.fontSize(10).font('Helvetica-Bold').text(`${label}: `, { continued: true });
      doc.font('Helvetica').text(String(value));
    });
    doc.moveDown(1);

    if (candidate.stewardship_intent) {
      doc.fontSize(14).font('Helvetica-Bold').text('Stewardship Intent');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').text(candidate.stewardship_intent);
      doc.moveDown(1);
    }

    if (candidate.public_summary) {
      doc.fontSize(14).font('Helvetica-Bold').text('Public Summary');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').text(candidate.public_summary);
      doc.moveDown(1);
    }

    if (checklistResult.rows.length > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Due Diligence Checklist');
      doc.moveDown(0.5);

      const categories = ['title', 'environmental', 'survey', 'access', 'zoning', 'financial'];
      const categoryLabels: Record<string, string> = {
        title: 'Title & Ownership',
        environmental: 'Environmental',
        survey: 'Survey & Boundaries',
        access: 'Access & Utilities',
        zoning: 'Zoning & Restrictions',
        financial: 'Financial'
      };

      for (const cat of categories) {
        const items = checklistResult.rows.filter(r => r.category === cat);
        if (items.length === 0) continue;

        doc.fontSize(12).font('Helvetica-Bold').text(categoryLabels[cat] || cat);
        doc.moveDown(0.3);

        items.forEach(item => {
          const status = item.is_completed ? '☑' : '☐';
          doc.fontSize(10).font('Helvetica').text(`  ${status} ${item.task_name}`);
          if (item.notes) {
            doc.fontSize(9).fillColor('#666').text(`      Notes: ${item.notes}`);
            doc.fillColor('#000');
          }
        });
        doc.moveDown(0.5);
      }

      const completed = checklistResult.rows.filter(r => r.is_completed).length;
      const total = checklistResult.rows.length;
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica-Bold').text(`Overall Progress: ${completed}/${total} (${Math.round((completed/total)*100)}%)`);
    }

    if (historyResult.rows.length > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Activity Timeline');
      doc.moveDown(0.5);

      historyResult.rows.forEach(event => {
        const date = new Date(event.created_at).toLocaleDateString();
        doc.fontSize(10).font('Helvetica-Bold').text(`${date} - ${event.event_title}`);
        if (event.event_description) {
          doc.fontSize(9).font('Helvetica').fillColor('#666').text(`  ${event.event_description}`);
          doc.fillColor('#000');
        }
        doc.moveDown(0.3);
      });
    }

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#999').text('This document is for governance review purposes only. Not a legal document.', { align: 'center' });
    doc.text('Axiom Protocol - Community Land Stewardship', { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate PDF' });
  }
}
