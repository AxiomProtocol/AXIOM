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
        'SELECT * FROM workbook_notes WHERE case_id = $1 ORDER BY updated_at DESC',
        [caseId]
      );

      return res.status(200).json({
        success: true,
        notes: result.rows,
      });
    } catch (error) {
      console.error('Error fetching notes:', error);
      return res.status(500).json({ error: 'Failed to fetch notes' });
    }
  }

  if (req.method === 'POST') {
    if (!testMode) {
      return res.status(401).json({ error: 'Subscription required' });
    }

    try {
      const { title, content } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Note content is required' });
      }

      const result = await pool.query(`
        INSERT INTO workbook_notes (case_id, title, content)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [caseId, title || 'Untitled Note', content]);

      return res.status(201).json({
        success: true,
        note: result.rows[0],
      });
    } catch (error) {
      console.error('Error creating note:', error);
      return res.status(500).json({ error: 'Failed to create note' });
    }
  }

  if (req.method === 'PUT') {
    if (!testMode) {
      return res.status(401).json({ error: 'Subscription required' });
    }

    try {
      const { id, title, content } = req.body;

      const result = await pool.query(`
        UPDATE workbook_notes SET title = $1, content = $2, updated_at = NOW()
        WHERE id = $3 AND case_id = $4
        RETURNING *
      `, [title, content, id, caseId]);

      return res.status(200).json({
        success: true,
        note: result.rows[0],
      });
    } catch (error) {
      console.error('Error updating note:', error);
      return res.status(500).json({ error: 'Failed to update note' });
    }
  }

  if (req.method === 'DELETE') {
    if (!testMode) {
      return res.status(401).json({ error: 'Subscription required' });
    }

    try {
      const { id } = req.body;
      await pool.query('DELETE FROM workbook_notes WHERE id = $1 AND case_id = $2', [id, caseId]);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting note:', error);
      return res.status(500).json({ error: 'Failed to delete note' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
