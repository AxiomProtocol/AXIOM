import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Outcome ID is required' });
  }

  const { decision, reviewer, notes } = req.body;

  if (!decision || !['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be "approved" or "rejected"' });
  }

  if (!reviewer || typeof reviewer !== 'string') {
    return res.status(400).json({ error: 'reviewer is required' });
  }

  try {
    const check = await pool.query(
      `SELECT id, status FROM verified_project_outcomes WHERE id = $1`,
      [id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Outcome not found' });
    }

    const newStatus = decision === 'approved' ? 'approved' : 'rejected';

    await pool.query(
      `UPDATE verified_project_outcomes SET
        status = $1,
        reviewed_by = $2,
        reviewed_at = NOW(),
        verification_timestamp = CASE WHEN $1 = 'approved' THEN NOW() ELSE verification_timestamp END,
        updated_at = NOW()
       WHERE id = $3`,
      [newStatus, reviewer, id]
    );

    await pool.query(
      `INSERT INTO verification_reviews (outcome_id, reviewer, decision, notes, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, reviewer, decision, notes || null]
    );

    const updated = await pool.query(
      `SELECT * FROM verified_project_outcomes WHERE id = $1`,
      [id]
    );

    return res.status(200).json({ outcome: updated.rows[0] });
  } catch (err: any) {
    console.error('POST /api/verified-outcomes/[id]/review error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
