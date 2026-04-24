import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { appendAuditEvent } from '../../../server/audit/hashChain';

function isAuthorized(req: NextApiRequest): boolean {
  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  if (req.headers['x-admin-key'] === adminKey && adminKey) return true;
  if (!adminKey && process.env.NODE_ENV === 'development') return true;
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { userId, enable } = req.body;
  if (!userId || typeof enable !== 'boolean') {
    return res.status(400).json({ error: 'userId (string) and enable (boolean) are required' });
  }

  try {
    const profile = await pool.query(
      'SELECT * FROM gef_user_execution_profiles WHERE user_id = $1',
      [userId]
    );

    if (profile.rows.length === 0) {
      return res.status(404).json({ error: 'User execution profile not found' });
    }

    const user = profile.rows[0];

    if (enable) {
      const tier = await pool.query(
        'SELECT * FROM gef_tier_thresholds WHERE tier_id = $1',
        [user.current_tier_id]
      );
      if (tier.rows.length === 0 || !tier.rows[0].execution_enabled) {
        return res.status(400).json({
          error: 'Current tier does not allow live execution',
          currentTier: user.current_tier_id,
        });
      }

      if (user.execution_suspended) {
        return res.status(400).json({
          error: 'Account execution is suspended',
          reason: user.suspension_reason,
        });
      }
    }

    await pool.query(
      `UPDATE gef_user_execution_profiles
       SET live_enabled = $1, live_start_date = CASE WHEN $1 = true AND live_start_date IS NULL THEN NOW() ELSE live_start_date END, updated_at = NOW()
       WHERE user_id = $2`,
      [enable, userId]
    );

    await appendAuditEvent('USER', userId, enable ? 'LIVE_ENABLED' : 'LIVE_DISABLED', {
      userId,
      enable,
      tier: user.current_tier_id,
    });

    return res.status(200).json({
      success: true,
      liveEnabled: enable,
      message: enable
        ? 'Live execution enabled. Ensure EXECUTION_LIVE_ENABLED is set system-wide.'
        : 'Live execution disabled.',
    });
  } catch (err: any) {
    console.error('[execution/request-live] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
