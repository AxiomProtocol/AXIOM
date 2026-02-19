import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash, timingSafeEqual } from 'crypto';
import { pool } from '../../../../server/db';
import { computeFullMetrics, computeYieldPermission, routeInflow, AME_VERSION } from '../../../../lib/solvency/ame';
import { evaluatePolicy, determineSeverity } from '../../../../lib/solvency/ame/PolicyEngine';
import { fetchAllProviderData } from '../../../../lib/solvency/ame/providers';
import type { AmeInputs } from '../../../../lib/solvency/ame';

function computeChecksum(data: any): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function parseExplicitInputs(body: any): AmeInputs {
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-cache');

  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  const provided = req.headers['x-admin-key'];
  if (!adminKey || typeof provided !== 'string' || !safeCompare(provided, adminKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = req.body || {};
    let inputs: AmeInputs;
    let checksum: string;
    let providerMeta: any = null;
    let dataSnapshotId: string | null = null;

    if (body.treasuryLiquidUsd !== undefined || body.treasuryTotalUsd !== undefined) {
      inputs = parseExplicitInputs(body);
      checksum = computeChecksum(inputs);
    } else {
      const providerResult = await fetchAllProviderData();
      inputs = providerResult.inputs;
      checksum = providerResult.checksum;
      providerMeta = providerResult.providerMeta;

      if (inputs.treasuryTotalUsd === 0 && inputs.netExternalExposureUsd === 0) {
        return res.status(404).json({
          schemaVersion: 'ame-run-v2',
          dataStatus: 'empty',
          error: 'No solvency snapshot available to derive AME inputs',
          providerMeta,
        });
      }
    }

    const dataSnapshotResult = await pool.query(
      `INSERT INTO ame_data_snapshot (provider, checksum, payload_json)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id`,
      [providerMeta ? 'provider-pipeline' : 'run-v2-explicit', checksum, JSON.stringify(inputs)]
    );
    dataSnapshotId = dataSnapshotResult.rows[0].id;

    const metrics = computeFullMetrics(inputs);
    const yieldPermission = computeYieldPermission(metrics.stabilityScore, metrics.policyMode);
    const waterfall = routeInflow(100, metrics.policyMode);

    const metricSnapshotResult = await pool.query(
      `INSERT INTO ame_metric_snapshot (
        environment, version,
        treasury_total_usd, treasury_liquid_usd, designated_reserves_usd, loss_buffer_usd,
        net_external_exposure_usd, gross_issuance_axusd, circulating_exposure_usd,
        coverage_ratio, reserve_ratio, liquidity_stability_ratio,
        redemption_stress_ratio, volatility_pressure_index, stability_score,
        policy_mode, composition_json, inputs_ref
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id`,
      [
        body.environment || 'PRODUCTION',
        AME_VERSION,
        inputs.treasuryTotalUsd,
        inputs.treasuryLiquidUsd,
        inputs.designatedReservesUsd,
        inputs.lossBufferUsd,
        inputs.netExternalExposureUsd,
        0,
        inputs.circulatingExposureUsd,
        metrics.coverageRatio,
        metrics.reserveRatio,
        metrics.liquidityStabilityRatio,
        metrics.redemptionStressRatio,
        metrics.volatilityPressureIndex,
        metrics.stabilityScore,
        metrics.policyMode,
        JSON.stringify(providerMeta || {}),
        dataSnapshotId,
      ]
    );
    const metricSnapshotId = metricSnapshotResult.rows[0].id;

    const enforcementEvents: any[] = [];

    const prevPolicyResult = await pool.query(
      `SELECT policy_mode FROM ame_policy_state ORDER BY created_at DESC LIMIT 1`
    );
    const prevPolicyMode = prevPolicyResult.rows.length > 0
      ? prevPolicyResult.rows[0].policy_mode
      : null;

    if (prevPolicyMode !== metrics.policyMode) {
      await pool.query(
        `INSERT INTO ame_policy_state (policy_mode, trigger_metric, trigger_value, thresholds_json, notes, evaluation_id)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
        [
          metrics.policyMode,
          metrics.triggerMetric,
          metrics.triggerValue,
          JSON.stringify({}),
          prevPolicyMode
            ? `Policy mode changed from ${prevPolicyMode} to ${metrics.policyMode}`
            : `Initial policy mode set to ${metrics.policyMode}`,
          metricSnapshotId,
        ]
      );

      if (prevPolicyMode !== null) {
        const modeChangeResult = await pool.query(
          `INSERT INTO ame_enforcement_event (event_type, severity, policy_mode, details_json, metric_snapshot_id, evaluation_id)
           VALUES ($1, $2, $3, $4::jsonb, $5, $6)
           RETURNING *`,
          [
            'MODE_CHANGE',
            determineSeverity(metrics.policyMode),
            metrics.policyMode,
            JSON.stringify({
              previousMode: prevPolicyMode,
              newMode: metrics.policyMode,
              triggerMetric: metrics.triggerMetric,
              triggerValue: metrics.triggerValue,
            }),
            metricSnapshotId,
            metricSnapshotId,
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
        `INSERT INTO ame_enforcement_event (event_type, severity, policy_mode, details_json, metric_snapshot_id, evaluation_id)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6)
         RETURNING *`,
        [
          'HARD_BRAKE_ARMED',
          'CRITICAL',
          metrics.policyMode,
          JSON.stringify({ reasons: metrics.hardBrakeReasons, armedByRunV2: true }),
          metricSnapshotId,
          metricSnapshotId,
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
      metricSnapshotId,
      dataSnapshotId,
      metrics,
      yieldPermission,
      waterfall,
      checksum,
      enforcementEvents,
      providerMeta,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[solvency/ame/run-v2] Error:', error);
    return res.status(500).json({
      schemaVersion: 'ame-run-v2',
      dataStatus: 'error',
      error: 'Failed to run AME v2 evaluation',
    });
  }
}
