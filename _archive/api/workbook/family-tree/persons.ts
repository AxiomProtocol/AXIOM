import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const testMode = process.env.WORKBOOK_TEST_MODE === 'true';
  const { caseId } = req.query;

  if (!caseId) {
    return res.status(400).json({ error: 'Case ID required' });
  }

  if (req.method === 'GET') {
    try {
      const persons = await pool.query(
        'SELECT * FROM workbook_persons WHERE case_id = $1 ORDER BY is_primary_ancestor DESC, created_at ASC',
        [caseId]
      );

      const relationships = await pool.query(
        'SELECT * FROM workbook_relationships WHERE case_id = $1',
        [caseId]
      );

      return res.status(200).json({
        success: true,
        persons: persons.rows,
        relationships: relationships.rows,
      });
    } catch (error) {
      console.error('Error fetching family tree:', error);
      return res.status(500).json({ error: 'Failed to fetch family tree' });
    }
  }

  if (req.method === 'POST') {
    if (!testMode) {
      return res.status(401).json({ error: 'Subscription required' });
    }

    try {
      const { fullName, givenName, surname, birthYear, birthPlace, deathYear, deathPlace, gender, notes, isPrimaryAncestor } = req.body;

      if (!fullName) {
        return res.status(400).json({ error: 'Full name is required' });
      }

      const result = await pool.query(`
        INSERT INTO workbook_persons 
        (case_id, full_name, given_name, surname, birth_year, birth_place, death_year, death_place, gender, notes, is_primary_ancestor)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [caseId, fullName, givenName, surname, birthYear, birthPlace, deathYear, deathPlace, gender, notes, isPrimaryAncestor || false]);

      return res.status(201).json({
        success: true,
        person: result.rows[0],
      });
    } catch (error) {
      console.error('Error creating person:', error);
      return res.status(500).json({ error: 'Failed to create person' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
