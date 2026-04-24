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

  const { userId, suspend, reason, policyMode, riskBudget, dailyLossLimit, rollingLossLimit, maxDrawdownLimit, consecutiveLossBrake } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const profile = await pool.query(
      'SELECT * FROM gef_user_execution_profiles WHERE user_id = $1',
      [userId]
    );

    if (profile.rows.length === 0) {
      return res.status(404).json({ error: 'User execution profile not found' });
    }

    const updates: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let paramIdx = 1;

    if (typeof suspend === 'boolean') {
      updates.push(`execution_suspended = $${paramIdx++}`);
      params.push(suspend);
      updates.push(`suspension_reason = $${paramIdx++}`);
      params.push(suspend ? (reason || 'Admin action') : null);
    }

    if (policyMode) {
      const pm = await pool.query('SELECT mode_id FROM gef_policy_modes WHERE mode_id = $1', [policyMode]);
      if (pm.rows.length === 0) {
        return res.status(400).json({ error: `Unknown policy mode: ${policyMode}` });
      }
      updates.push(`current_policy_mode = $${paramIdx++}`);
      params.push(policyMode);
    }

    if (riskBudget !== undefined) {
      updates.push(`risk_budget_axusd = $${paramIdx++}`);
      params.push(Number(riskBudget));
    }

    if (dailyLossLimit !== undefined) {
      updates.push(`daily_loss_limit_axusd = $${paramIdx++}`);
      params.push(Number(dailyLossLimit));
    }

    if (rollingLossLimit !== undefined) {
      updates.push(`rolling_7d_loss_limit_axusd = $${paramIdx++}`);
      params.push(Number(rollingLossLimit));
    }

    if (maxDrawdownLimit !== undefined) {
      updates.push(`max_drawdown_limit_pct = $${paramIdx++}`);
      params.push(Number(maxDrawdownLimit));
    }

    if (consecutiveLossBrake !== undefined) {
      updates.push(`consecutive_loss_brake = $${paramIdx++}`);
      params.push(Number(consecutiveLossBrake));
    }

    if (params.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(userId);
    await pool.query(
      `UPDATE gef_user_execution_profiles SET ${updates.join(', ')} WHERE user_id = $${paramIdx}`,
      params
    );

    await appendAuditEvent('USER', userId, 'STATUS_UPDATED', {
      userId,
      changes: req.body,
    });

    return res.status(200).json({ success: true, message: 'Profile updated' });
  } catch (err: any) {
    console.error('[execution/set-status] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
