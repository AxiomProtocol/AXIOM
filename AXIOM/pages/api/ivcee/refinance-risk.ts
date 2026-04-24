import type { NextApiRequest, NextApiResponse } from 'next';
import { loadIVCEEInput, getDefaultScenarioId } from '../../../lib/ivcee/adapter';
import { computeRefinanceRisk } from '../../../lib/ivcee/models';
import { upsertRefinanceRisk } from '../../../lib/ivcee/persist';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  try {
    const dealId = (req.body?.dealId || req.query.dealId) as string;
    let scenarioId = (req.body?.scenarioId || req.query.scenarioId) as string | undefined;
    if (!dealId) return res.status(400).json({ error: 'dealId is required' });
    if (!scenarioId) {
      scenarioId = await getDefaultScenarioId(dealId) || undefined;
      if (!scenarioId) return res.status(400).json({ error: 'No scenario found' });
    }

    const input = await loadIVCEEInput(dealId, scenarioId);
    const result = computeRefinanceRisk(input);
    await upsertRefinanceRisk(dealId, scenarioId, result);

    return res.status(200).json({ data: result, meta: { dealId, scenarioId, computedAt: new Date().toISOString() } });
  } catch (err: any) {
    console.error('[IVCEE refinance-risk]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
