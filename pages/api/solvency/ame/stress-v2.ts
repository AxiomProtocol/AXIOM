import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { computeFullMetrics, runStressProjection, runAllStressProjections, STRESS_SCENARIOS } from '../../../../lib/solvency/ame';
import type { AmeInputs, StressProjection } from '../../../../lib/solvency/ame';

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
        schemaVersion: 'ame-stress-v2',
        dataStatus: 'empty',
        error: 'No solvency snapshot available to derive AME inputs',
      });
    }

    const scenarioKeys: string[] | undefined = body.scenarioKeys;
    let projections: StressProjection[];

    if (scenarioKeys && Array.isArray(scenarioKeys) && scenarioKeys.length > 0) {
      const filtered = STRESS_SCENARIOS.filter((s) => scenarioKeys.includes(s.key));
      projections = filtered.map((scenario) => runStressProjection(inputs, scenario));
    } else {
      projections = runAllStressProjections(inputs);
    }

    let worstSeverity: 'INFO' | 'WARN' | 'CRITICAL' = 'INFO';
    let worstCase: StressProjection | null = null;

    for (const proj of projections) {
      if (proj.policyModeAfter === 'EMERGENCY' || proj.policyModeAfter === 'RESTRICTED') {
        worstSeverity = 'CRITICAL';
        if (!worstCase || proj.policyModeAfter === 'EMERGENCY') {
          worstCase = proj;
        }
      } else if (proj.policyModeAfter === 'DEFENSIVE' && worstSeverity !== 'CRITICAL') {
        worstSeverity = 'WARN';
        if (!worstCase) {
          worstCase = proj;
        }
      }
      if (!worstCase) {
        worstCase = proj;
      }
    }

    const checksum = computeChecksum(projections);

    const policyResult = await pool.query(
      `SELECT policy_mode FROM ame_policy_state ORDER BY created_at DESC LIMIT 1`
    );
    const currentPolicyMode = policyResult.rows.length > 0
      ? policyResult.rows[0].policy_mode
      : 'BOOTSTRAP';

    await pool.query(
      `INSERT INTO ame_enforcement_event (event_type, severity, policy_mode, details_json)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [
        'STRESS_TEST_RUN',
        worstSeverity,
        currentPolicyMode,
        JSON.stringify({
          scenarioCount: projections.length,
          scenarioKeys: projections.map((p) => p.scenario.key),
          worstCaseScenario: worstCase?.scenario.key || null,
          worstCasePolicyMode: worstCase?.policyModeAfter || null,
          worstCaseHardBrake: worstCase?.hardBrakeAfter || false,
          breachCount: projections.reduce((sum, p) => sum + p.breaches.length, 0),
          checksum,
        }),
      ]
    );

    return res.status(200).json({
      schemaVersion: 'ame-stress-v2',
      dataStatus: 'ok',
      projections,
      worstCase,
      checksum,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[solvency/ame/stress-v2] Error:', error);
    return res.status(200).json({
      schemaVersion: 'ame-stress-v2',
      dataStatus: 'error',
      error: 'Failed to run stress projections',
    });
  }
}
