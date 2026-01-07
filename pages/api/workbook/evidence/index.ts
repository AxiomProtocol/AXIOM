import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { checkEntitlement } from '../../../../lib/workbook/entitlements';
import { getUserFromSiweSession } from '../../../../lib/workbook/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserFromSiweSession(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const caseId = parseInt(req.query.caseId as string);
  if (isNaN(caseId)) {
    return res.status(400).json({ error: 'Case ID is required' });
  }

  const caseResult = await pool.query(
    `SELECT * FROM workbook_cases WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [caseId, userId]
  );

  if (caseResult.rows.length === 0) {
    return res.status(404).json({ error: 'Case not found' });
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT * FROM evidence_items WHERE case_id = $1 ORDER BY created_at DESC`,
        [caseId]
      );

      const evidence = result.rows.map(row => ({
        id: row.id,
        caseId: row.case_id,
        userId: row.user_id,
        title: row.title,
        recordType: row.record_type,
        primaryOrSecondary: row.primary_or_secondary,
        confidenceLevel: row.confidence_level,
        sourceName: row.source_name,
        sourceLocation: row.source_location,
        sourceCitation: row.source_citation,
        dateAccessed: row.date_accessed,
        yearRangeStart: row.year_range_start,
        yearRangeEnd: row.year_range_end,
        county: row.county,
        state: row.state,
        legalDescription: row.legal_description,
        fileId: row.file_id,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

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

      const result = await pool.query(
        `INSERT INTO evidence_items (
          case_id, user_id, title, record_type, primary_or_secondary, confidence_level,
          source_name, source_location, source_citation, date_accessed,
          year_range_start, year_range_end, county, state, legal_description, file_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          caseId, userId, title, recordType, primaryOrSecondary, confidenceLevel || 'unsupported',
          sourceName, sourceLocation || null, sourceCitation || null, new Date(dateAccessed),
          yearRangeStart || null, yearRangeEnd || null, county || null, state || null,
          legalDescription || null, fileId || null, notes || null
        ]
      );

      const row = result.rows[0];
      const newEvidence = {
        id: row.id,
        caseId: row.case_id,
        userId: row.user_id,
        title: row.title,
        recordType: row.record_type,
        primaryOrSecondary: row.primary_or_secondary,
        confidenceLevel: row.confidence_level,
        sourceName: row.source_name,
        sourceLocation: row.source_location,
        sourceCitation: row.source_citation,
        dateAccessed: row.date_accessed,
        createdAt: row.created_at,
      };

      return res.status(201).json({ success: true, data: newEvidence });
    } catch (error) {
      console.error('Failed to create evidence:', error);
      return res.status(500).json({ error: 'Failed to create evidence' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
