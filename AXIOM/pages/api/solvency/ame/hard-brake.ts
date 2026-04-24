import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-cache');

  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_SOLVENCY_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { action, reasons } = req.body || {};

    if (action !== 'arm' && action !== 'release') {
      return res.status(400).json({ error: 'action must be "arm" or "release"' });
    }

    const policyResult = await pool.query(
      `SELECT policy_mode FROM ame_policy_state ORDER BY created_at DESC LIMIT 1`
    );
    const currentPolicyMode = policyResult.rows.length > 0
      ? policyResult.rows[0].policy_mode
      : 'BOOTSTRAP';

    if (action === 'arm') {
      const reasonsList = Array.isArray(reasons) ? reasons : [];

      const insertResult = await pool.query(
        `INSERT INTO ame_enforcement_event (event_type, severity, policy_mode, details_json)
         VALUES ($1, $2, $3, $4::jsonb)
         RETURNING *`,
        [
          'HARD_BRAKE_ARMED',
          'CRITICAL',
          currentPolicyMode,
          JSON.stringify({ reasons: reasonsList, armedAt: new Date().toISOString() }),
        ]
      );

      const event = insertResult.rows[0];
      return res.status(200).json({
        success: true,
        action: 'arm',
        event: {
          id: event.id,
          createdAt: event.created_at,
          eventType: event.event_type,
          severity: event.severity,
          policyMode: event.policy_mode,
          detailsJson: event.details_json,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'release') {
      const latestState = await pool.query(
        `SELECT * FROM ame_policy_state ORDER BY created_at DESC LIMIT 1`
      );

      if (latestState.rows.length > 0) {
        const mode = latestState.rows[0].policy_mode;
        if (mode === 'EMERGENCY' || mode === 'RESTRICTED') {
          return res.status(400).json({
            error: `Cannot release hard brake while policy mode is ${mode}. Metrics must meet safe thresholds first.`,
          });
        }
      }

      const insertResult = await pool.query(
        `INSERT INTO ame_enforcement_event (event_type, severity, policy_mode, details_json)
         VALUES ($1, $2, $3, $4::jsonb)
         RETURNING *`,
        [
          'HARD_BRAKE_RELEASED',
          'INFO',
          currentPolicyMode,
          JSON.stringify({ releasedAt: new Date().toISOString(), confirmation: 'Hard brake released after threshold verification' }),
        ]
      );

      const event = insertResult.rows[0];
      return res.status(200).json({
        success: true,
        action: 'release',
        event: {
          id: event.id,
          createdAt: event.created_at,
          eventType: event.event_type,
          severity: event.severity,
          policyMode: event.policy_mode,
          detailsJson: event.details_json,
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error('[solvency/ame/hard-brake] Error:', error);
    return res.status(500).json({ error: 'Failed to process hard brake action' });
  }
}
