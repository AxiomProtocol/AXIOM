import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

function isAuthorized(req: NextApiRequest): boolean {
  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  if (req.headers['x-admin-key'] === adminKey && adminKey) return true;
  if (!adminKey && process.env.NODE_ENV === 'development') return true;
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }

  try {
    const profileResult = await pool.query(
      'SELECT * FROM gef_user_execution_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'User execution profile not found' });
    }

    const profile = profileResult.rows[0];

    const tierResult = await pool.query(
      'SELECT * FROM gef_tier_thresholds WHERE tier_id = $1',
      [profile.current_tier_id]
    );

    const policyResult = await pool.query(
      'SELECT * FROM gef_policy_modes WHERE mode_id = $1',
      [profile.current_policy_mode]
    );

    const latestSnapshot = await pool.query(
      'SELECT * FROM gef_qualification_snapshots WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    const openPositions = await pool.query(
      `SELECT COUNT(*) FROM gef_execution_intents WHERE user_id = $1 AND status = 'OPEN'`,
      [userId]
    );

    const recentViolations = await pool.query(
      `SELECT * FROM gef_violation_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );

    return res.status(200).json({
      profile,
      tier: tierResult.rows[0] || null,
      policyMode: policyResult.rows[0] || null,
      latestQualification: latestSnapshot.rows[0] || null,
      openPositionCount: parseInt(openPositions.rows[0].count),
      recentViolations: recentViolations.rows,
    });
  } catch (err: any) {
    console.error('[execution/user-profile] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
