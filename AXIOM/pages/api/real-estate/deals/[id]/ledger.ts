import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { reDeals, reDealScenarios, reDealMetrics, reDecisionLog, reRiskFlags } from '../../../../../shared/realEstateSchema';
import { eq, desc, sql } from 'drizzle-orm';
import { successResponse, errorResponse, buildMeta } from '../../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET is accepted');
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return errorResponse(res, 400, 'INVALID_ID', 'Deal ID is required');
  }

  try {
    const [deal] = await db.select().from(reDeals).where(eq(reDeals.id, id)).limit(1);
    if (!deal) {
      return errorResponse(res, 404, 'DEAL_NOT_FOUND', 'Deal does not exist');
    }

    const scenarios = await db.select().from(reDealScenarios)
      .where(eq(reDealScenarios.dealId, id));

    const allMetrics = [];
    const allRiskFlags = [];
    for (const scenario of scenarios) {
      const metrics = await db.select().from(reDealMetrics)
        .where(eq(reDealMetrics.scenarioId, scenario.id));
      const flags = await db.select().from(reRiskFlags)
        .where(eq(reRiskFlags.scenarioId, scenario.id));
      allMetrics.push(...metrics.map(m => ({ ...m, scenarioName: scenario.scenarioName })));
      allRiskFlags.push(...flags.map(f => ({ ...f, scenarioName: scenario.scenarioName })));
    }

    const decisions = await db.select().from(reDecisionLog)
      .where(eq(reDecisionLog.dealId, id))
      .orderBy(desc(reDecisionLog.decidedAt));

    const timeline = [
      { type: 'deal_created', timestamp: deal.createdAt, detail: { strategy: deal.strategy } },
      ...decisions.map(d => ({
        type: 'decision',
        timestamp: d.decidedAt,
        detail: { action: d.decision, actor: d.decidedBy, rationale: d.rationale },
      })),
      ...allMetrics.map(m => ({
        type: 'metrics_computed',
        timestamp: m.computedAt,
        detail: { scenario: m.scenarioName, capRate: m.capRate, dscr: m.dscr, cashOnCash: m.cashOnCash },
      })),
    ].sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });

    return successResponse(res, {
      deal: { id: deal.id, dealName: deal.dealName, strategy: deal.strategy, status: deal.status },
      timeline,
      metricsHistory: allMetrics,
      riskFlagHistory: allRiskFlags,
    }, buildMeta(['internal_db'], 0.7));

  } catch (err: any) {
    console.error('Deal ledger error:', err.message);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch deal ledger');
  }
}
