import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { reDealAssumptions, reDealScenarios } from '../../../../../shared/realEstateSchema';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse, buildMeta, parseNumeric } from '../../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return errorResponse(res, 400, 'INVALID_ID', 'Deal ID is required');
  }

  if (req.method === 'GET') {
    try {
      const { scenario_id } = req.query;
      if (!scenario_id || typeof scenario_id !== 'string') {
        return errorResponse(res, 400, 'INVALID_PARAMS', 'scenario_id query param is required');
      }

      const [assumptions] = await db.select()
        .from(reDealAssumptions)
        .where(eq(reDealAssumptions.scenarioId, scenario_id))
        .limit(1);

      return successResponse(res, { assumptions: assumptions || null }, buildMeta(['internal_db'], assumptions ? 0.7 : 0.4));
    } catch (err: any) {
      console.error('Assumptions fetch error:', err.message);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch assumptions');
    }
  }

  if (req.method === 'PUT') {
    try {
      const { scenarioId, ...values } = req.body;
      if (!scenarioId || typeof scenarioId !== 'string') {
        return errorResponse(res, 400, 'INVALID_PARAMS', 'scenarioId is required in request body');
      }

      const [scenario] = await db.select()
        .from(reDealScenarios)
        .where(eq(reDealScenarios.id, scenarioId))
        .limit(1);

      if (!scenario || scenario.dealId !== id) {
        return errorResponse(res, 404, 'SCENARIO_NOT_FOUND', 'Scenario not found for this deal');
      }

      const numericFields = [
        'purchasePrice', 'rehabBudget', 'arvEstimate', 'downPaymentPct',
        'interestRate', 'loanTermYears', 'closingCostPct',
        'monthlyRent', 'vacancyPct', 'propertyMgmtPct',
        'annualInsurance', 'annualTaxes', 'annualCapex', 'annualMaintenance',
        'holdPeriodMonths', 'appreciationPct',
      ];

      const upsertValues: Record<string, any> = { scenarioId };
      for (const field of numericFields) {
        if (values[field] !== undefined) {
          upsertValues[field] = String(parseNumeric(values[field]));
        }
      }

      const existing = await db.select()
        .from(reDealAssumptions)
        .where(eq(reDealAssumptions.scenarioId, scenarioId))
        .limit(1);

      if (existing.length > 0) {
        await db.update(reDealAssumptions)
          .set({ ...upsertValues, updatedAt: new Date() })
          .where(eq(reDealAssumptions.scenarioId, scenarioId));
      } else {
        await db.insert(reDealAssumptions).values(upsertValues);
      }
      const [assumptions] = await db.select().from(reDealAssumptions)
        .where(eq(reDealAssumptions.scenarioId, scenarioId)).limit(1);

      return successResponse(res, { assumptions }, buildMeta(['internal_db', 'user_input'], 0.7));
    } catch (err: any) {
      console.error('Assumptions upsert error:', err.message);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to upsert assumptions');
    }
  }

  return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET and PUT are accepted');
}
