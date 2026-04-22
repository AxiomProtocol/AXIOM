import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';

const VALID_TRANSITIONS: Record<string, string[]> = {
  submitted: ['under_review'],
  under_review: ['submitted'],
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const actorAddress = session.address;

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Outcome ID is required' });
  }

  const { status, notes } = req.body;
  if (!status || typeof status !== 'string') {
    return res.status(400).json({ error: 'status is required' });
  }

  try {
    const check = await pool.query(
      `SELECT id, status, submitted_by FROM verified_project_outcomes WHERE id = $1`,
      [id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Outcome not found' });
    }

    const current = check.rows[0].status;
    const submittedBy = check.rows[0].submitted_by;

    if (submittedBy && submittedBy.toLowerCase() !== actorAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Only the original submitter can request review.' });
    }

    const allowed = VALID_TRANSITIONS[current] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Cannot transition from ${current} to ${status}` });
    }

    await pool.query(
      `UPDATE verified_project_outcomes SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id]
    );

    if (status === 'under_review') {
      await pool.query(
        `INSERT INTO verification_reviews (outcome_id, reviewer, decision, notes, created_at)
         VALUES ($1, $2, 'under_review', $3, NOW())`,
        [id, actorAddress, notes || 'Requested by operator for founder review']
      );
    }

    const updated = await pool.query(
      `SELECT * FROM verified_project_outcomes WHERE id = $1`,
      [id]
    );
    return res.status(200).json({ outcome: updated.rows[0] });
  } catch (err: any) {
    console.error('set-status error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
