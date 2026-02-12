import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { runStressScenario, runAllStressScenarios, STRESS_SCENARIOS } from '../../../lib/solvency';
import type { SolvencyMetrics, StressScenario, StressResult } from '../../../lib/solvency';

async function fetchSnapshotById(snapshotId: string): Promise<{
  payload: Record<string, any>;
  id: string;
} | null> {
  try {
    const result = await pool.query(
      `SELECT id, payload_json FROM solvency_snapshots WHERE id = $1`,
      [snapshotId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      payload: typeof row.payload_json === 'string'
        ? JSON.parse(row.payload_json)
        : row.payload_json,
      id: row.id,
    };
  } catch {
    return null;
  }
}

async function fetchLatestSnapshot(): Promise<{
  payload: Record<string, any>;
  id: string;
} | null> {
  try {
    const result = await pool.query(
      `SELECT id, payload_json FROM solvency_snapshots ORDER BY created_at DESC LIMIT 1`
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      payload: typeof row.payload_json === 'string'
        ? JSON.parse(row.payload_json)
        : row.payload_json,
      id: row.id,
    };
  } catch {
    return null;
  }
}

function buildMetricsFromPayload(payload: Record<string, any>): SolvencyMetrics {
  return {
    schemaVersion: 'solvency-v1',
    dataStatus: 'ok',
    asOfUtc: String(payload.asOfUtc || new Date().toISOString()),
    snapshotId: '',
    checksum: '',
    treasuryTotalUsd: Math.round(Number(payload.treasuryTotalUsd || 0) * 100) / 100,
    treasuryLiquidUsd: Math.round(Number(payload.treasuryLiquidUsd || 0) * 100) / 100,
    reservesTotalUsd: Math.round(Number(payload.reservesTotalUsd || 0) * 100) / 100,
    liabilitiesTotalUsd: Math.round(Number(payload.liabilitiesTotalUsd || 0) * 100) / 100,
    reserveRatio: 0,
    coverageRatio: 0,
    lossBufferUsd: Math.round(Number(payload.lossBufferUsd || 0) * 100) / 100,
    policyMode: (payload.policyMode || 'NORMAL') as SolvencyMetrics['policyMode'],
    regimeState: String(payload.regimeState || 'NORMAL'),
    hardBrake: String(payload.hardBrake || 'OFF'),
    gateStatus: String(payload.gateStatus || 'OPEN'),
    composition: Array.isArray(payload.composition) ? payload.composition : [],
    limitations: Array.isArray(payload.limitations) ? payload.limitations : [],
    sources: Array.isArray(payload.sources) ? payload.sources : [],
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { snapshotId, scenarioId, customScenario } = req.body || {};

    const snapshot = snapshotId
      ? await fetchSnapshotById(snapshotId)
      : await fetchLatestSnapshot();

    if (!snapshot) {
      return res.status(404).json({ error: 'No snapshot found' });
    }

    const metrics = buildMetricsFromPayload(snapshot.payload);
    metrics.snapshotId = snapshot.id;

    const liab = metrics.liabilitiesTotalUsd;
    metrics.coverageRatio = liab > 0
      ? Math.round(((metrics.treasuryTotalUsd + metrics.reservesTotalUsd) / liab) * 10000) / 10000
      : 0;
    metrics.reserveRatio = liab > 0
      ? Math.round((metrics.reservesTotalUsd / liab) * 10000) / 10000
      : 0;

    let results: StressResult[];

    if (scenarioId) {
      const found = STRESS_SCENARIOS.find((s) => s.id === scenarioId);
      if (!found) {
        return res.status(400).json({ error: `Unknown scenarioId: ${scenarioId}` });
      }
      results = [runStressScenario(metrics, found)];
    } else if (customScenario) {
      const custom: StressScenario = {
        id: 'custom',
        label: 'Custom Scenario',
        description: 'User-defined stress scenario',
        treasuryDrawdownPct: Number(customScenario.treasuryDrawdownPct || 0),
        reserveDrawdownPct: Number(customScenario.reserveDrawdownPct || 0),
        liabilityIncreasePct: Number(customScenario.liabilityIncreasePct || 0),
        ethPriceChangePct: Number(customScenario.ethPriceChangePct || 0),
      };
      results = [runStressScenario(metrics, custom)];
    } else {
      results = runAllStressScenarios(metrics);
    }

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS scenario_runs (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          snapshot_id VARCHAR NOT NULL,
          scenario_id VARCHAR,
          results_json JSONB NOT NULL
        )
      `);
      await pool.query(
        `INSERT INTO scenario_runs (id, snapshot_id, scenario_id, results_json) VALUES (gen_random_uuid(), $1, $2, $3::jsonb)`,
        [snapshot.id, scenarioId || customScenario ? 'custom' : 'all', JSON.stringify(results)]
      );
    } catch {
    }

    return res.status(200).json({
      schemaVersion: 'solvency-scenario-v1',
      snapshotId: snapshot.id,
      results,
    });
  } catch (error: any) {
    console.error('[solvency/scenario] Error:', error);
    return res.status(200).json({
      schemaVersion: 'solvency-scenario-v1',
      snapshotId: 'none',
      results: [],
    });
  }
}
