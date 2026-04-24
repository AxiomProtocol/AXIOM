import type { NextApiRequest, NextApiResponse } from 'next';
import { loadIVCEEInput, getDefaultScenarioId } from '../../../lib/ivcee/adapter';
import { computeAll } from '../../../lib/ivcee/models';
import {
  upsertProbabilityModel,
  insertSensitivityRows,
  insertStressRows,
  upsertRefinanceRisk,
  upsertDownsideMetrics,
  upsertCapitalEfficiency,
  recomputeCapitalRanks,
} from '../../../lib/ivcee/persist';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const dealId = (req.body?.dealId || req.query.dealId) as string;
    let scenarioId = (req.body?.scenarioId || req.query.scenarioId) as string | undefined;

    if (!dealId) {
      return res.status(400).json({ error: 'dealId is required' });
    }

    if (!scenarioId) {
      scenarioId = await getDefaultScenarioId(dealId) || undefined;
      if (!scenarioId) {
        return res.status(400).json({ error: 'No scenario found for this deal. Run underwriting first.' });
      }
    }

    const input = await loadIVCEEInput(dealId, scenarioId);
    const results = computeAll(input);

    await upsertProbabilityModel(dealId, scenarioId, results.probability);
    await insertSensitivityRows(dealId, scenarioId, results.sensitivity);
    await insertStressRows(dealId, scenarioId, results.stressTests);
    await upsertRefinanceRisk(dealId, scenarioId, results.refinanceRisk);
    await upsertDownsideMetrics(dealId, scenarioId, results.downside);
    await upsertCapitalEfficiency(dealId, scenarioId, results.capitalEfficiency);
    await recomputeCapitalRanks();

    return res.status(200).json({
      data: results,
      meta: {
        dealId,
        scenarioId,
        computedAt: new Date().toISOString(),
        engine: 'IVCEE v1.0',
        modules: ['probability', 'sensitivity', 'stress_tests', 'refinance_risk', 'downside', 'capital_efficiency'],
        sensitivityRowCount: results.sensitivity.length,
      },
    });
  } catch (err: any) {
    console.error('[IVCEE run-all]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
