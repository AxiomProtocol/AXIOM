import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { computeFullMetrics, runStressProjection, runAllStressProjections, STRESS_SCENARIOS } from '../../../../lib/solvency/ame';
import { fetchAllProviderData } from '../../../../lib/solvency/ame/providers';
import type { StressProjection } from '../../../../lib/solvency/ame';
import { computeChecksum, safeCompare, parseExplicitInputs } from '../../../../lib/solvency/ame/utils';
import type { AmeInputs } from '../../../../lib/solvency/ame';

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

    if (body.treasuryLiquidUsd !== undefined || body.treasuryTotalUsd !== undefined) {
      inputs = parseExplicitInputs(body);
    } else {
      const providerResult = await fetchAllProviderData();
      inputs = providerResult.inputs;

      if (inputs.treasuryTotalUsd === 0 && inputs.netExternalExposureUsd === 0) {
        return res.status(404).json({
          schemaVersion: 'ame-stress-v2',
          dataStatus: 'empty',
          error: 'No solvency snapshot available to derive AME inputs',
        });
      }
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

    const latestSnapshotResult = await pool.query(
      `SELECT id FROM ame_metric_snapshot ORDER BY created_at DESC LIMIT 1`
    );
    const baseSnapshotId = latestSnapshotResult.rows.length > 0
      ? latestSnapshotResult.rows[0].id
      : null;

    const runName = body.runName || `stress-${scenarioKeys ? scenarioKeys.join('-') : 'all'}-${new Date().toISOString().slice(0, 19)}`;

    const conclusion = worstCase
      ? `Worst case: ${worstCase.scenario.label} results in ${worstCase.policyModeAfter} mode${worstCase.hardBrakeAfter ? ' with hard brake' : ''}. ${projections.reduce((sum, p) => sum + p.breaches.length, 0)} total breaches across ${projections.length} scenarios.`
      : 'No stress scenarios evaluated.';

    await pool.query(
      `INSERT INTO ame_stress_run (run_name, base_snapshot_id, scenarios_json, results_json, conclusion, policy_mode_after)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)`,
      [
        runName,
        baseSnapshotId,
        JSON.stringify(projections.map(p => ({ key: p.scenario.key, label: p.scenario.label, shock: p.scenario.shock }))),
        JSON.stringify(projections.map(p => ({
          scenarioKey: p.scenario.key,
          policyModeAfter: p.policyModeAfter,
          hardBrakeAfter: p.hardBrakeAfter,
          breachCount: p.breaches.length,
          breaches: p.breaches,
          stabilityScore: p.projectedMetrics.stabilityScore,
          coverageRatio: p.projectedMetrics.coverageRatio,
        }))),
        conclusion,
        worstCase?.policyModeAfter || currentPolicyMode,
      ]
    );

    await pool.query(
      `INSERT INTO ame_enforcement_event (event_type, severity, policy_mode, details_json, metric_snapshot_id)
       VALUES ($1, $2, $3, $4::jsonb, $5)`,
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
        baseSnapshotId,
      ]
    );

    return res.status(200).json({
      schemaVersion: 'ame-stress-v2',
      dataStatus: 'ok',
      projections,
      worstCase,
      conclusion,
      checksum,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[solvency/ame/stress-v2] Error:', error);
    return res.status(500).json({
      schemaVersion: 'ame-stress-v2',
      dataStatus: 'error',
      error: 'Failed to run stress projections',
    });
  }
}
