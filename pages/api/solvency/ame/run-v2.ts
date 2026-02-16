import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { computeFullMetrics, computeYieldPermission, routeInflow } from '../../../../lib/solvency/ame';
import type { AmeInputs } from '../../../../lib/solvency/ame';

const { createHash } = require('crypto');

function computeChecksum(data: any): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);
}

async function buildInputs(body: any): Promise<AmeInputs | null> {
  if (body.treasuryLiquidUsd !== undefined || body.treasuryTotalUsd !== undefined) {
    return {
      treasuryLiquidUsd: Number(body.treasuryLiquidUsd || 0),
      treasuryTotalUsd: Number(body.treasuryTotalUsd || 0),
      designatedReservesUsd: Number(body.designatedReservesUsd || 0),
      lossBufferUsd: Number(body.lossBufferUsd || 0),
      netExternalExposureUsd: Number(body.netExternalExposureUsd || 0),
      circulatingExposureUsd: Number(body.circulatingExposureUsd || 0),
      redemptionCapacityUsd: Number(body.redemptionCapacityUsd || 0),
      estimatedRedemptionDemandUsd: Number(body.estimatedRedemptionDemandUsd || 0),
      volatilitySignals: {
        pegDeviation: Number(body.volatilitySignals?.pegDeviation ?? 0.05),
        liquidityDepthDrop: Number(body.volatilitySignals?.liquidityDepthDrop ?? 0.05),
        redemptionAcceleration: Number(body.volatilitySignals?.redemptionAcceleration ?? 0.05),
        correlationSpike: Number(body.volatilitySignals?.correlationSpike ?? 0.05),
      },
      liquiditySignals: {
        depthUsd: Number(body.liquiditySignals?.depthUsd ?? 0),
        bidAskSpreadBps: Number(body.liquiditySignals?.bidAskSpreadBps ?? 0),
        volumeChange24h: Number(body.liquiditySignals?.volumeChange24h ?? 0),
      },
    };
  }

  const snapshotResult = await pool.query(
    `SELECT payload_json FROM solvency_snapshots ORDER BY created_at DESC LIMIT 1`
  );

  if (snapshotResult.rows.length === 0) {
    return null;
  }

  const payload = typeof snapshotResult.rows[0].payload_json === 'string'
    ? JSON.parse(snapshotResult.rows[0].payload_json)
    : snapshotResult.rows[0].payload_json;

  return {
    treasuryLiquidUsd: Number(payload.treasuryLiquidUsd || 0),
    treasuryTotalUsd: Number(payload.treasuryTotalUsd || 0),
    designatedReservesUsd: Number(payload.designatedReservesUsd || 0),
    lossBufferUsd: Number(payload.lossBufferUsd || 0),
    netExternalExposureUsd: Number(payload.netExternalExposureUsd || payload.liabilitiesTotalUsd || 0),
    circulatingExposureUsd: Number(payload.circulatingExposureUsd || payload.liabilitiesTotalUsd || 0),
    redemptionCapacityUsd: Number(payload.redemptionCapacityUsd || 0),
    estimatedRedemptionDemandUsd: Number(payload.estimatedRedemptionDemandUsd || 0),
    volatilitySignals: {
      pegDeviation: Number(body.volatilitySignals?.pegDeviation ?? 0.05),
      liquidityDepthDrop: Number(body.volatilitySignals?.liquidityDepthDrop ?? 0.05),
      redemptionAcceleration: Number(body.volatilitySignals?.redemptionAcceleration ?? 0.05),
      correlationSpike: Number(body.volatilitySignals?.correlationSpike ?? 0.05),
    },
    liquiditySignals: {
      depthUsd: Number(body.liquiditySignals?.depthUsd ?? 0),
      bidAskSpreadBps: Number(body.liquiditySignals?.bidAskSpreadBps ?? 0),
      volumeChange24h: Number(body.liquiditySignals?.volumeChange24h ?? 0),
    },
  };
}

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
    const body = req.body || {};
    const inputs = await buildInputs(body);

    if (!inputs) {
      return res.status(200).json({
        schemaVersion: 'ame-run-v2',
        dataStatus: 'empty',
        error: 'No solvency snapshot available to derive AME inputs',
      });
    }

    const metrics = computeFullMetrics(inputs);
    const yieldPermission = computeYieldPermission(metrics.stabilityScore, metrics.policyMode);
    const waterfall = routeInflow(100, metrics.policyMode);
    const checksum = computeChecksum(inputs);

    await pool.query(
      `INSERT INTO ame_data_snapshot (provider, checksum, payload_json)
       VALUES ($1, $2, $3::jsonb)`,
      ['run-v2', checksum, JSON.stringify(inputs)]
    );

    const enforcementEvents: any[] = [];

    const prevPolicyResult = await pool.query(
      `SELECT policy_mode FROM ame_policy_state ORDER BY created_at DESC LIMIT 1`
    );
    const prevPolicyMode = prevPolicyResult.rows.length > 0
      ? prevPolicyResult.rows[0].policy_mode
      : null;

    if (prevPolicyMode !== metrics.policyMode) {
      await pool.query(
        `INSERT INTO ame_policy_state (policy_mode, trigger_metric, trigger_value, thresholds_json, notes)
         VALUES ($1, $2, $3, $4::jsonb, $5)`,
        [
          metrics.policyMode,
          metrics.triggerMetric,
          metrics.triggerValue,
          JSON.stringify({}),
          prevPolicyMode
            ? `Policy mode changed from ${prevPolicyMode} to ${metrics.policyMode}`
            : `Initial policy mode set to ${metrics.policyMode}`,
        ]
      );

      if (prevPolicyMode !== null) {
        const modeChangeResult = await pool.query(
          `INSERT INTO ame_enforcement_event (event_type, severity, policy_mode, details_json)
           VALUES ($1, $2, $3, $4::jsonb)
           RETURNING *`,
          [
            'MODE_CHANGE',
            metrics.policyMode === 'EMERGENCY' || metrics.policyMode === 'RESTRICTED' ? 'CRITICAL' : metrics.policyMode === 'DEFENSIVE' ? 'WARN' : 'INFO',
            metrics.policyMode,
            JSON.stringify({
              previousMode: prevPolicyMode,
              newMode: metrics.policyMode,
              triggerMetric: metrics.triggerMetric,
              triggerValue: metrics.triggerValue,
            }),
          ]
        );
        enforcementEvents.push({
          id: modeChangeResult.rows[0].id,
          eventType: 'MODE_CHANGE',
          severity: modeChangeResult.rows[0].severity,
          policyMode: metrics.policyMode,
          detailsJson: modeChangeResult.rows[0].details_json,
          createdAt: modeChangeResult.rows[0].created_at,
        });
      }
    }

    const prevBrakeResult = await pool.query(
      `SELECT event_type FROM ame_enforcement_event
       WHERE event_type IN ('HARD_BRAKE_ARMED', 'HARD_BRAKE_RELEASED')
       ORDER BY created_at DESC LIMIT 1`
    );
    const wasArmed = prevBrakeResult.rows.length > 0 && prevBrakeResult.rows[0].event_type === 'HARD_BRAKE_ARMED';

    if (metrics.hardBrake && !wasArmed) {
      const brakeResult = await pool.query(
        `INSERT INTO ame_enforcement_event (event_type, severity, policy_mode, details_json)
         VALUES ($1, $2, $3, $4::jsonb)
         RETURNING *`,
        [
          'HARD_BRAKE_ARMED',
          'CRITICAL',
          metrics.policyMode,
          JSON.stringify({ reasons: metrics.hardBrakeReasons, armedByRunV2: true }),
        ]
      );
      enforcementEvents.push({
        id: brakeResult.rows[0].id,
        eventType: 'HARD_BRAKE_ARMED',
        severity: 'CRITICAL',
        policyMode: metrics.policyMode,
        detailsJson: brakeResult.rows[0].details_json,
        createdAt: brakeResult.rows[0].created_at,
      });
    }

    return res.status(200).json({
      schemaVersion: 'ame-run-v2',
      dataStatus: 'ok',
      metrics,
      yieldPermission,
      waterfall,
      checksum,
      enforcementEvents,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[solvency/ame/run-v2] Error:', error);
    return res.status(200).json({
      schemaVersion: 'ame-run-v2',
      dataStatus: 'error',
      error: 'Failed to run AME v2 evaluation',
    });
  }
}
