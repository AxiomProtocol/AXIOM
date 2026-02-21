import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { reDeals, reProperties, reDealScenarios, reDealAssumptions, reDealMetrics, reRiskFlags, reDecisionLog, reComparables } from '../../../../../shared/realEstateSchema';
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

    const [property] = await db.select().from(reProperties)
      .where(eq(reProperties.id, deal.propertyId)).limit(1);

    const scenarios = await db.select().from(reDealScenarios)
      .where(eq(reDealScenarios.dealId, id))
      .orderBy(desc(reDealScenarios.createdAt));

    const scenarioData = await Promise.all(
      scenarios.map(async (scenario) => {
        const [assumptions] = await db.select().from(reDealAssumptions)
          .where(eq(reDealAssumptions.scenarioId, scenario.id)).limit(1);
        const [metrics] = await db.select().from(reDealMetrics)
          .where(eq(reDealMetrics.scenarioId, scenario.id)).limit(1);
        const riskFlags = await db.select().from(reRiskFlags)
          .where(eq(reRiskFlags.scenarioId, scenario.id));

        return {
          scenario,
          assumptions: assumptions || null,
          metrics: metrics || null,
          riskFlags,
        };
      })
    );

    const [decisionCount] = await db.select({ total: sql<number>`count(*)` })
      .from(reDecisionLog)
      .where(eq(reDecisionLog.dealId, id));

    const recentDecisions = await db.select().from(reDecisionLog)
      .where(eq(reDecisionLog.dealId, id))
      .orderBy(desc(reDecisionLog.decidedAt))
      .limit(20);

    const comparables = await db.select().from(reComparables)
      .where(eq(reComparables.dealId, id));

    const hasMetrics = scenarioData.some(s => s.metrics !== null);
    const confidence = hasMetrics ? 1.0 : 0.4;

    return successResponse(res, {
      deal,
      property: property || null,
      scenarios: scenarioData,
      comparables,
      decisions: {
        total: Number(decisionCount?.total ?? 0),
        recent: recentDecisions,
      },
    }, buildMeta(['internal_db', 'derived_computation'], confidence));

  } catch (err: any) {
    console.error('Deal summary error:', err.message);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch deal summary');
  }
}
