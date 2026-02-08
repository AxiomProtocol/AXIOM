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
        'SELECT * FROM workbook_checklist_progress WHERE case_id = $1',
        [caseId]
      );

      return res.status(200).json({
        success: true,
        progress: result.rows,
      });
    } catch (error) {
      console.error('Error fetching checklist progress:', error);
      return res.status(500).json({ error: 'Failed to fetch progress' });
    }
  }

  if (req.method === 'POST') {
    if (!testMode) {
      return res.status(401).json({ error: 'Subscription required' });
    }

    try {
      const { checklistType, stepId, completed, notes } = req.body;

      const result = await pool.query(`
        INSERT INTO workbook_checklist_progress 
        (case_id, checklist_type, step_id, completed, completed_at, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (case_id, checklist_type, step_id) 
        DO UPDATE SET 
          completed = EXCLUDED.completed,
          completed_at = CASE WHEN EXCLUDED.completed THEN NOW() ELSE NULL END,
          notes = COALESCE(EXCLUDED.notes, workbook_checklist_progress.notes)
        RETURNING *
      `, [caseId, checklistType, stepId, completed, completed ? new Date() : null, notes || null]);

      return res.status(200).json({
        success: true,
        progress: result.rows[0],
      });
    } catch (error) {
      console.error('Error updating checklist progress:', error);
      return res.status(500).json({ error: 'Failed to update progress' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
