import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { queryOracle } from '../../../../lib/solvency/ame/oracle';
import { computeFullMetrics, computeYieldPermission, getWaterfall } from '../../../../lib/solvency/ame';
import type { AmeInputs, AmeMetricsResult } from '../../../../lib/solvency/ame';
import type { OracleQueryType } from '../../../../lib/solvency/ame/oracle';

function buildInputsFromSnapshot(payload: any): AmeInputs {
  const treasuryTotalUsd = Number(payload.treasuryTotalUsd || 0);
  const treasuryLiquidUsd = Number(payload.treasuryLiquidUsd || 0);
  const reservesTotalUsd = Number(payload.reservesTotalUsd || 0);
  const liabilitiesTotalUsd = Number(payload.liabilitiesTotalUsd || 0);
  const lossBufferUsd = Number(payload.lossBufferUsd || 0);

  const composition: any[] = Array.isArray(payload.composition) ? payload.composition : [];
  const psmReserves = composition
    .filter((item: any) => item.label && item.label.toUpperCase().includes('PSM'))
    .reduce((sum: number, item: any) => sum + Number(item.valueUsd || 0), 0);

  return {
    treasuryLiquidUsd,
    treasuryTotalUsd,
    designatedReservesUsd: reservesTotalUsd,
    lossBufferUsd,
    netExternalExposureUsd: liabilitiesTotalUsd,
    circulatingExposureUsd: liabilitiesTotalUsd,
    redemptionCapacityUsd: psmReserves || treasuryLiquidUsd * 0.8,
    estimatedRedemptionDemandUsd: liabilitiesTotalUsd * 0.15,
    volatilitySignals: {
      pegDeviation: 0.05,
      liquidityDepthDrop: 0.05,
      redemptionAcceleration: 0.05,
      correlationSpike: 0.05,
    },
    liquiditySignals: {
      depthUsd: 0,
      bidAskSpreadBps: 0,
      volumeChange24h: 0,
    },
  };
}

const VALID_QUERY_TYPES: OracleQueryType[] = [
  'regime_narration',
  'stress_recommendation',
  'tradeoff_analysis',
  'audit_summary',
  'full_briefing',
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-cache');

  try {
    const { queryType = 'regime_narration', includeStress = false } = req.body || {};

    if (!VALID_QUERY_TYPES.includes(queryType)) {
      return res.status(400).json({
        error: `Invalid queryType. Valid options: ${VALID_QUERY_TYPES.join(', ')}`,
      });
    }

    const snapshotResult = await pool.query(
      `SELECT payload_json FROM solvency_snapshots ORDER BY created_at DESC LIMIT 1`
    );

    let metrics: AmeMetricsResult | null = null;
    let yieldPermission = null;
    let waterfall = null;

    if (snapshotResult.rows.length > 0) {
      const payload = typeof snapshotResult.rows[0].payload_json === 'string'
        ? JSON.parse(snapshotResult.rows[0].payload_json)
        : snapshotResult.rows[0].payload_json;

      const inputs = buildInputsFromSnapshot(payload);
      metrics = computeFullMetrics(inputs);
      yieldPermission = computeYieldPermission(metrics.stabilityScore, metrics.policyMode);
      waterfall = getWaterfall(metrics.policyMode);
    }

    const eventsResult = await pool.query(
      `SELECT event_type as "eventType", severity, policy_mode as "policyMode",
              created_at as "createdAt", details_json as "detailsJson"
       FROM ame_enforcement_event
       ORDER BY created_at DESC
       LIMIT 20`
    ).catch(() => ({ rows: [] }));

    let previousMetrics: AmeMetricsResult | null = null;
    const prevSnapshotResult = await pool.query(
      `SELECT payload_json FROM solvency_snapshots ORDER BY created_at DESC LIMIT 1 OFFSET 1`
    ).catch(() => ({ rows: [] }));

    if (prevSnapshotResult.rows.length > 0) {
      const prevPayload = typeof prevSnapshotResult.rows[0].payload_json === 'string'
        ? JSON.parse(prevSnapshotResult.rows[0].payload_json)
        : prevSnapshotResult.rows[0].payload_json;
      const prevInputs = buildInputsFromSnapshot(prevPayload);
      previousMetrics = computeFullMetrics(prevInputs);
    }

    let stressProjections = null;
    if (includeStress && metrics) {
      const { runAllStressProjections } = await import('../../../../lib/solvency/ame');
      const inputs = buildInputsFromSnapshot(
        typeof snapshotResult.rows[0].payload_json === 'string'
          ? JSON.parse(snapshotResult.rows[0].payload_json)
          : snapshotResult.rows[0].payload_json
      );
      stressProjections = runAllStressProjections(inputs);
    }

    const oracleResult = await queryOracle(queryType as OracleQueryType, {
      metrics,
      previousMetrics,
      yieldPermission,
      waterfall,
      recentEvents: eventsResult.rows,
      stressProjections,
    });

    return res.status(200).json({
      schemaVersion: 'oracle-v1',
      dataStatus: metrics ? 'ok' : 'empty',
      ...oracleResult,
      metricsSnapshot: metrics ? {
        stabilityScore: metrics.stabilityScore,
        policyMode: metrics.policyMode,
        regimeBand: metrics.regimeBand,
        hardBrake: metrics.hardBrake,
        coverageRatio: metrics.coverageRatio,
        reserveRatio: metrics.reserveRatio,
      } : null,
    });
  } catch (error: any) {
    console.error('[solvency/ame/oracle] Error:', error);
    return res.status(200).json({
      schemaVersion: 'oracle-v1',
      dataStatus: 'error',
      interpretation: 'Oracle interpretation temporarily unavailable. Deterministic metrics remain the authoritative source for all capital decisions.',
      queryType: req.body?.queryType || 'regime_narration',
      timestamp: new Date().toISOString(),
      disclaimer: 'AI-generated interpretation. Not financial advice.',
      error: 'Failed to generate oracle interpretation',
    });
  }
}
