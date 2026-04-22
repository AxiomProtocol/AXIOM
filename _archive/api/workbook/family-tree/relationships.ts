import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const testMode = process.env.WORKBOOK_TEST_MODE === 'true';
  const { caseId } = req.query;

  if (!caseId) {
    return res.status(400).json({ error: 'Case ID required' });
  }

  if (req.method === 'POST') {
    if (!testMode) {
      return res.status(401).json({ error: 'Subscription required' });
    }

    try {
      const { personId, relatedPersonId, relationshipType } = req.body;

      if (!personId || !relatedPersonId || !relationshipType) {
        return res.status(400).json({ error: 'Person IDs and relationship type are required' });
      }

      const result = await pool.query(`
        INSERT INTO workbook_relationships (case_id, person_id, related_person_id, relationship_type)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [caseId, personId, relatedPersonId, relationshipType]);

      return res.status(201).json({
        success: true,
        relationship: result.rows[0],
      });
    } catch (error) {
      console.error('Error creating relationship:', error);
      return res.status(500).json({ error: 'Failed to create relationship' });
    }
  }

  if (req.method === 'DELETE') {
    if (!testMode) {
      return res.status(401).json({ error: 'Subscription required' });
    }

    try {
      const { id } = req.body;
      await pool.query('DELETE FROM workbook_relationships WHERE id = $1 AND case_id = $2', [id, caseId]);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting relationship:', error);
      return res.status(500).json({ error: 'Failed to delete relationship' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
