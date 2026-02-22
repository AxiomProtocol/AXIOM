import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { reDeals, reProperties, reDealScenarios, reDealAssumptions, reDecisionLog } from '../../../../shared/realEstateSchema';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse, buildMeta, safePropertyColumns } from '../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only POST is accepted');
  }

  try {
    const { propertyId, strategy, name, notes } = req.body;

    if (!propertyId || typeof propertyId !== 'string') {
      return errorResponse(res, 400, 'INVALID_PARAMS', 'propertyId is required');
    }

    const validStrategies = ['brrrr', 'flip', 'hold', 'note', 'multifamily'];
    if (!strategy || !validStrategies.includes(strategy)) {
      return errorResponse(res, 400, 'INVALID_STRATEGY', `Strategy must be one of: ${validStrategies.join(', ')}`);
    }

    const [property] = await db.select(safePropertyColumns)
      .from(reProperties)
      .where(eq(reProperties.id, propertyId))
      .limit(1);

    if (!property) {
      return errorResponse(res, 404, 'PROPERTY_NOT_FOUND', 'Referenced property does not exist');
    }

    await db.insert(reDeals).values({
      propertyId,
      strategy,
      status: 'draft',
      dealName: name || `${strategy.toUpperCase()} - ${property.addressNormalized || property.addressRaw}`,
      notes: notes || null,
    });

    const [deal] = await db.select().from(reDeals)
      .where(eq(reDeals.propertyId, propertyId))
      .limit(1);

    await db.insert(reDealScenarios).values({
      dealId: deal.id,
      scenarioName: 'Base Case',
      isPrimary: true,
    });

    const [scenario] = await db.select().from(reDealScenarios)
      .where(eq(reDealScenarios.dealId, deal.id))
      .limit(1);

    await db.insert(reDealAssumptions).values({
      scenarioId: scenario.id,
      purchasePrice: '200000',
      arvEstimate: '280000',
      rehabBudget: '40000',
      downPaymentPct: '20',
      interestRate: '7.5',
      loanTermYears: 30,
      closingCostPct: '3',
      monthlyRent: '1800',
      vacancyPct: '8',
      propertyMgmtPct: '10',
      annualInsurance: '1800',
      annualTaxes: '3600',
      annualCapex: '2000',
      annualMaintenance: '2000',
      holdPeriodMonths: 6,
      appreciationPct: '3',
    });

    await db.insert(reDecisionLog).values({
      dealId: deal.id,
      decision: 'DEAL_CREATED',
      decidedBy: 'system',
      rationale: `Deal workspace created for ${property.addressRaw || property.addressNormalized}. Strategy: ${strategy.toUpperCase()}. Base Case scenario with default assumptions ready for underwriting.`,
    });

    return successResponse(res, { deal, scenario }, buildMeta(['internal_db', 'user_input'], 0.7));

  } catch (err: any) {
    console.error('Deal create error:', err.message);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to create deal');
  }
}
