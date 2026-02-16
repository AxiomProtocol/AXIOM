import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');

  try {
    const policyResult = await pool.query(
      `SELECT * FROM ame_policy_state ORDER BY created_at DESC LIMIT 1`
    );

    const eventsResult = await pool.query(
      `SELECT * FROM ame_enforcement_event ORDER BY created_at DESC LIMIT 20`
    );

    const policyState = policyResult.rows.length > 0
      ? {
          id: policyResult.rows[0].id,
          createdAt: policyResult.rows[0].created_at,
          policyMode: policyResult.rows[0].policy_mode,
          triggerMetric: policyResult.rows[0].trigger_metric,
          triggerValue: Number(policyResult.rows[0].trigger_value),
          thresholdsJson: policyResult.rows[0].thresholds_json,
          notes: policyResult.rows[0].notes,
          evaluationId: policyResult.rows[0].evaluation_id,
        }
      : null;

    const recentEvents = eventsResult.rows.map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
      eventType: row.event_type,
      severity: row.severity,
      policyMode: row.policy_mode,
      detailsJson: row.details_json,
      metricSnapshotId: row.metric_snapshot_id,
      evaluationId: row.evaluation_id,
    }));

    let hardBrakeArmed = false;
    for (const event of recentEvents) {
      if (event.eventType === 'HARD_BRAKE_ARMED') {
        hardBrakeArmed = true;
        break;
      }
      if (event.eventType === 'HARD_BRAKE_RELEASED') {
        break;
      }
    }

    return res.status(200).json({
      policyState,
      recentEvents,
      hardBrakeArmed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[solvency/ame/enforcement] Error:', error);
    return res.status(200).json({
      policyState: null,
      recentEvents: [],
      hardBrakeArmed: false,
      timestamp: new Date().toISOString(),
    });
  }
}
