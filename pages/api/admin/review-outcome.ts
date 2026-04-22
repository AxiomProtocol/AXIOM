import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

function checkAdminKey(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-solvency-key'] || req.headers['x-admin-key'];
  return key === process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAdminKey(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { outcomeId, decision, notes } = req.body as {
    outcomeId?: string;
    decision?: 'approved' | 'rejected' | 'delete';
    notes?: string;
  };

  if (!outcomeId) return res.status(400).json({ error: 'outcomeId is required' });
  if (!decision || !['approved', 'rejected', 'delete'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be approved, rejected, or delete' });
  }

  const check = await pool.query(
    'SELECT id, status FROM verified_project_outcomes WHERE id = $1',
    [outcomeId]
  ).catch(() => null);

  if (!check || check.rows.length === 0) {
    return res.status(404).json({ error: 'Outcome not found' });
  }

  if (decision === 'delete') {
    try {
      await pool.query('BEGIN');
      await pool.query('DELETE FROM project_outcome_cost_items WHERE outcome_id = $1', [outcomeId]);
      await pool.query('DELETE FROM project_outcome_documents WHERE outcome_id = $1', [outcomeId]);
      await pool.query('DELETE FROM prediction_actual_variances WHERE outcome_id = $1', [outcomeId]);
      await pool.query('DELETE FROM operator_strategy_signals WHERE outcome_id = $1', [outcomeId]);
      await pool.query('DELETE FROM verification_reviews WHERE outcome_id = $1', [outcomeId]);
      await pool.query('DELETE FROM verified_data_rewards WHERE outcome_id = $1', [outcomeId]);
      await pool.query('DELETE FROM verified_project_outcomes WHERE id = $1', [outcomeId]);
      await pool.query('COMMIT');
      return res.status(200).json({ success: true, action: 'deleted', outcomeId });
    } catch (err: any) {
      await pool.query('ROLLBACK').catch(() => {});
      console.error('[review-outcome] delete error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  const newStatus = decision === 'approved' ? 'approved' : 'rejected';

  try {
    await pool.query(
      `UPDATE verified_project_outcomes SET
         status = $1::verification_status,
         reviewed_by = 'admin',
         reviewed_at = NOW(),
         verification_timestamp = CASE WHEN $1 = 'approved' THEN NOW() ELSE verification_timestamp END,
         updated_at = NOW()
       WHERE id = $2`,
      [newStatus, outcomeId]
    );

    await pool.query(
      `INSERT INTO verification_reviews (outcome_id, reviewer, decision, notes, created_at)
       VALUES ($1, 'admin', $2, $3, NOW())`,
      [outcomeId, decision, notes || null]
    );

    const updated = await pool.query(
      'SELECT * FROM verified_project_outcomes WHERE id = $1',
      [outcomeId]
    );

    return res.status(200).json({ success: true, action: decision, outcome: updated.rows[0] });
  } catch (err: any) {
    console.error('[review-outcome] update error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
