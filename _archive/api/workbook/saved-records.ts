import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const testMode = process.env.WORKBOOK_TEST_MODE === 'true';
  const { caseId } = req.query;

  if (!caseId) {
    return res.status(400).json({ error: 'Case ID required' });
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        'SELECT * FROM workbook_saved_records WHERE case_id = $1 ORDER BY created_at DESC',
        [caseId]
      );

      return res.status(200).json({
        success: true,
        records: result.rows,
      });
    } catch (error) {
      console.error('Error fetching saved records:', error);
      return res.status(500).json({ error: 'Failed to fetch records' });
    }
  }

  if (req.method === 'POST') {
    if (!testMode) {
      return res.status(401).json({ error: 'Subscription required' });
    }

    try {
      const { recordName, recordType, source, birthYear, birthPlace, deathYear, deathPlace, details, confidence, isLandRecord, landDescription, rawData } = req.body;

      if (!recordName) {
        return res.status(400).json({ error: 'Record name is required' });
      }

      const result = await pool.query(`
        INSERT INTO workbook_saved_records 
        (case_id, record_name, record_type, source, birth_year, birth_place, death_year, death_place, details, confidence, is_land_record, land_description, raw_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [caseId, recordName, recordType, source, birthYear, birthPlace, deathYear, deathPlace, details, confidence, isLandRecord || false, landDescription, rawData ? JSON.stringify(rawData) : null]);

      return res.status(201).json({
        success: true,
        record: result.rows[0],
      });
    } catch (error) {
      console.error('Error saving record:', error);
      return res.status(500).json({ error: 'Failed to save record' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
