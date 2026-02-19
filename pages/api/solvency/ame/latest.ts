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
    const snapshotResult = await pool.query(
      `SELECT * FROM ame_metric_snapshot ORDER BY created_at DESC LIMIT 1`
    );

    const policyResult = await pool.query(
      `SELECT * FROM ame_policy_state ORDER BY created_at DESC LIMIT 1`
    );

    const brakeResult = await pool.query(
      `SELECT event_type FROM ame_enforcement_event
       WHERE event_type IN ('HARD_BRAKE_ARMED', 'HARD_BRAKE_RELEASED')
       ORDER BY created_at DESC LIMIT 1`
    );

    const hardBrakeArmed = brakeResult.rows.length > 0 && brakeResult.rows[0].event_type === 'HARD_BRAKE_ARMED';

    if (snapshotResult.rows.length === 0) {
      return res.status(200).json({
        schemaVersion: 'ame-latest-v2',
        dataStatus: 'empty',
        metricSnapshot: null,
        policyState: null,
        hardBrakeArmed: false,
        timestamp: new Date().toISOString(),
      });
    }

    const row = snapshotResult.rows[0];

    const metricSnapshot = {
      id: row.id,
      createdAt: row.created_at,
      environment: row.environment,
      version: row.version,
      treasuryTotalUsd: Number(row.treasury_total_usd),
      treasuryLiquidUsd: Number(row.treasury_liquid_usd),
      designatedReservesUsd: Number(row.designated_reserves_usd),
      lossBufferUsd: Number(row.loss_buffer_usd),
      netExternalExposureUsd: Number(row.net_external_exposure_usd),
      grossIssuanceAxusd: Number(row.gross_issuance_axusd),
      circulatingExposureUsd: Number(row.circulating_exposure_usd),
      coverageRatio: Number(row.coverage_ratio),
      reserveRatio: Number(row.reserve_ratio),
      liquidityStabilityRatio: Number(row.liquidity_stability_ratio),
      redemptionStressRatio: Number(row.redemption_stress_ratio),
      volatilityPressureIndex: Number(row.volatility_pressure_index),
      stabilityScore: Number(row.stability_score),
      policyMode: row.policy_mode,
      compositionJson: row.composition_json,
      inputsRef: row.inputs_ref,
    };

    const policyState = policyResult.rows.length > 0
      ? {
          id: policyResult.rows[0].id,
          createdAt: policyResult.rows[0].created_at,
          policyMode: policyResult.rows[0].policy_mode,
          triggerMetric: policyResult.rows[0].trigger_metric,
          triggerValue: Number(policyResult.rows[0].trigger_value),
          notes: policyResult.rows[0].notes,
        }
      : null;

    return res.status(200).json({
      schemaVersion: 'ame-latest-v2',
      dataStatus: 'ok',
      metricSnapshot,
      policyState,
      hardBrakeArmed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[solvency/ame/latest] Error:', error);
    return res.status(200).json({
      schemaVersion: 'ame-latest-v2',
      dataStatus: 'empty',
      metricSnapshot: null,
      policyState: null,
      hardBrakeArmed: false,
      timestamp: new Date().toISOString(),
    });
  }
}
