import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import {
  runStressScenario,
  buildEvaluation,
  DEFAULT_AME_CONFIG,
  STRESS_SCENARIOS,
} from '../../../../lib/ame';
import type { AMEInput, AMEEvaluation, LiabilityMode } from '../../../../lib/ame';

const { createHash } = require('crypto');

function computeChecksum(data: any): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);
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
    const { evaluationId, scenarioKey } = req.body || {};

    if (!scenarioKey) {
      return res.status(400).json({ error: 'scenarioKey is required' });
    }

    const scenario = STRESS_SCENARIOS.find((s) => s.scenarioKey === scenarioKey);
    if (!scenario) {
      return res.status(400).json({ error: `Unknown scenarioKey: ${scenarioKey}` });
    }

    let evalRow: any;

    if (evaluationId) {
      const evalResult = await pool.query(
        `SELECT e.*, s.raw_json
         FROM ame_evaluations e
         LEFT JOIN ame_input_snapshots s ON e.input_snapshot_id = s.id
         WHERE e.id = $1
         LIMIT 1`,
        [evaluationId]
      );
      if (evalResult.rows.length === 0) {
        return res.status(404).json({ error: 'Evaluation not found' });
      }
      evalRow = evalResult.rows[0];
    } else {
      const evalResult = await pool.query(
        `SELECT e.*, s.raw_json
         FROM ame_evaluations e
         LEFT JOIN ame_input_snapshots s ON e.input_snapshot_id = s.id
         ORDER BY e.created_at DESC
         LIMIT 1`
      );
      if (evalResult.rows.length === 0) {
        return res.status(200).json({
          schemaVersion: 'ame-stress-v1',
          dataStatus: 'empty',
          error: 'No AME evaluations exist to run stress against',
        });
      }
      evalRow = evalResult.rows[0];
    }

    const rawJson = evalRow.raw_json
      ? (typeof evalRow.raw_json === 'string' ? JSON.parse(evalRow.raw_json) : evalRow.raw_json)
      : null;

    if (!rawJson) {
      return res.status(200).json({
        schemaVersion: 'ame-stress-v1',
        dataStatus: 'error',
        error: 'Input snapshot data not found for this evaluation',
      });
    }

    const ameInput: AMEInput = {
      treasuryCapitalUsd: Number(rawJson.treasuryCapitalUsd || 0),
      liquidReservesUsd: Number(rawJson.liquidReservesUsd || 0),
      outstandingLiabilitiesUsd: Number(rawJson.outstandingLiabilitiesUsd || 0),
      redemptionCapacityUsd: Number(rawJson.redemptionCapacityUsd || 0),
      realizedVolatility: Number(rawJson.realizedVolatility || 0.15),
      drawdownPct: Number(rawJson.drawdownPct || 0),
      flowImbalance: Number(rawJson.flowImbalance || 0),
      liquidityCompression: Number(rawJson.liquidityCompression || 0),
      updateSourceVersion: String(rawJson.updateSourceVersion || 'snapshot-derived-v1'),
      mode: (rawJson.mode || 'GROSS') as LiabilityMode,
    };

    const baseEvaluation: AMEEvaluation = buildEvaluation(ameInput, DEFAULT_AME_CONFIG, evalRow.id, evalRow.input_snapshot_id);

    const stressResult = runStressScenario(baseEvaluation, ameInput, scenario, DEFAULT_AME_CONFIG);
    const resultChecksum = computeChecksum(stressResult);

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ame_stress_scenarios (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          scenario_key TEXT NOT NULL,
          shock_json JSONB NOT NULL,
          baseline_evaluation_id VARCHAR NOT NULL,
          projected_json JSONB NOT NULL,
          checksum TEXT NOT NULL
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS ame_stress_created_idx ON ame_stress_scenarios(created_at)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS ame_stress_scenario_idx ON ame_stress_scenarios(scenario_key)`);

      await pool.query(
        `INSERT INTO ame_stress_scenarios (id, created_at, scenario_key, shock_json, baseline_evaluation_id, projected_json, checksum)
         VALUES (gen_random_uuid(), NOW(), $1, $2::jsonb, $3, $4::jsonb, $5)`,
        [
          scenario.scenarioKey,
          JSON.stringify(scenario.shocks),
          evalRow.id,
          JSON.stringify(stressResult),
          resultChecksum,
        ]
      );
    } catch {
    }

    return res.status(200).json({
      schemaVersion: 'ame-stress-v1',
      dataStatus: 'ok',
      evaluationId: evalRow.id,
      scenarioKey,
      result: stressResult,
      checksum: resultChecksum,
    });
  } catch (error: any) {
    console.error('[solvency/ame/stress] Error:', error);
    return res.status(200).json({
      schemaVersion: 'ame-stress-v1',
      dataStatus: 'error',
      error: 'Failed to run stress scenario',
    });
  }
}
