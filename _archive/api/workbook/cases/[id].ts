import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid case ID' });
  }

  const caseId = parseInt(id, 10);
  if (isNaN(caseId)) {
    return res.status(400).json({ error: 'Invalid case ID format' });
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        'SELECT * FROM workbook_cases WHERE id = $1',
        [caseId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Case not found' });
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching case:', error);
      return res.status(500).json({ error: 'Failed to fetch case' });
    }
  }

  if (req.method === 'PUT') {
    const testMode = process.env.WORKBOOK_TEST_MODE === 'true';
    if (!testMode) {
      return res.status(401).json({ error: 'Subscription required' });
    }

    try {
      const { caseTitle, ancestorPrimaryName, jurisdictionCode, status } = req.body;

      const result = await pool.query(`
        UPDATE workbook_cases 
        SET case_title = COALESCE($1, case_title),
            ancestor_primary_name = COALESCE($2, ancestor_primary_name),
            jurisdiction_code = COALESCE($3, jurisdiction_code),
            status = COALESCE($4, status),
            updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `, [caseTitle, ancestorPrimaryName, jurisdictionCode, status, caseId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Case not found' });
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error updating case:', error);
      return res.status(500).json({ error: 'Failed to update case' });
    }
  }

  if (req.method === 'DELETE') {
    const testMode = process.env.WORKBOOK_TEST_MODE === 'true';
    if (!testMode) {
      return res.status(401).json({ error: 'Subscription required' });
    }

    try {
      const result = await pool.query(
        'DELETE FROM workbook_cases WHERE id = $1 RETURNING id',
        [caseId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Case not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Case deleted',
      });
    } catch (error) {
      console.error('Error deleting case:', error);
      return res.status(500).json({ error: 'Failed to delete case' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
