import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { reDeals, reDealScenarios, reDealAssumptions, reDealMetrics, reRiskFlags, reDecisionLog } from '../../../../../shared/realEstateSchema';
import { eq } from 'drizzle-orm';
import { computeUnderwriting } from '../../../../../server/services/real-estate/underwriting';
import { successResponse, errorResponse, buildMeta, parseNumeric } from '../../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only POST is accepted');
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return errorResponse(res, 400, 'INVALID_ID', 'Deal ID is required');
  }

  try {
    const { scenarioId } = req.body;
    if (!scenarioId || typeof scenarioId !== 'string') {
      return errorResponse(res, 400, 'INVALID_PARAMS', 'scenarioId is required');
    }

    const [deal] = await db.select().from(reDeals).where(eq(reDeals.id, id)).limit(1);
    if (!deal) {
      return errorResponse(res, 404, 'DEAL_NOT_FOUND', 'Deal does not exist');
    }

    const [scenario] = await db.select().from(reDealScenarios)
      .where(eq(reDealScenarios.id, scenarioId)).limit(1);
    if (!scenario || scenario.dealId !== id) {
      return errorResponse(res, 404, 'SCENARIO_NOT_FOUND', 'Scenario not found for this deal');
    }

    const [assumptions] = await db.select().from(reDealAssumptions)
      .where(eq(reDealAssumptions.scenarioId, scenarioId)).limit(1);
    if (!assumptions) {
      return errorResponse(res, 400, 'NO_ASSUMPTIONS', 'No assumptions found for this scenario. Save assumptions first.');
    }

    const p = (v: string | number | null | undefined) => parseNumeric(v);

    const purchasePrice = p(assumptions.purchasePrice);
    const arvEstimate = p(assumptions.arvEstimate);
    const closingCostPct = p(assumptions.closingCostPct);
    const downPaymentPct = p(assumptions.downPaymentPct);
    const closingCostBuy = closingCostPct * purchasePrice / 100;
    const closingCostSell = closingCostPct * arvEstimate / 100;
    const loanAmount = purchasePrice * (1 - downPaymentPct / 100);
    const holdPeriodMonths = p(assumptions.holdPeriodMonths);
    const monthlyHoldingCost = (p(assumptions.annualInsurance) + p(assumptions.annualTaxes) + p(assumptions.annualMaintenance)) / 12;

    const result = computeUnderwriting({
      strategy: deal.strategy as any,
      assumptions: {
        purchasePrice,
        afterRepairValue: arvEstimate,
        rehabCost: p(assumptions.rehabBudget),
        closingCostBuy,
        closingCostSell,
        holdingCostMonthly: monthlyHoldingCost,
        holdingPeriodMonths: holdPeriodMonths,
        loanAmount,
        interestRate: p(assumptions.interestRate),
        loanTermYears: p(assumptions.loanTermYears),
        monthlyRent: p(assumptions.monthlyRent),
        vacancyRate: p(assumptions.vacancyPct),
        propertyTaxAnnual: p(assumptions.annualTaxes),
        insuranceAnnual: p(assumptions.annualInsurance),
        maintenanceAnnual: p(assumptions.annualMaintenance),
        managementRate: p(assumptions.propertyMgmtPct),
        unitCount: 1,
      },
    });

    await db.delete(reRiskFlags).where(eq(reRiskFlags.scenarioId, scenarioId));

    const existingMetrics = await db.select().from(reDealMetrics)
      .where(eq(reDealMetrics.scenarioId, scenarioId)).limit(1);

    const annualCashFlow = result.noiAnnual - (result.monthlyDebtService * 12);
    const rehabCost = p(assumptions.rehabBudget);
    const rehabRoi = rehabCost > 0 ? ((arvEstimate - purchasePrice - rehabCost) / rehabCost) * 100 : 0;
    const grossRentalIncome = p(assumptions.monthlyRent) * 12;
    const rentToValue = purchasePrice > 0 ? (p(assumptions.monthlyRent) / purchasePrice) * 100 : 0;
    const grm = grossRentalIncome > 0 ? purchasePrice / grossRentalIncome : 0;
    const breakEvenMonths = annualCashFlow > 0 ? Math.ceil(result.cashNeeded / (annualCashFlow / 12)) : null;

    const metricsValues = {
      scenarioId,
      noi: String(result.noiAnnual),
      capRate: String(result.capRate),
      cashOnCash: String(result.cashOnCash),
      dscr: String(result.dscr),
      monthlyCashFlow: String(Math.round((annualCashFlow / 12) * 100) / 100),
      annualCashFlow: String(Math.round(annualCashFlow)),
      breakEvenMonths: breakEvenMonths,
      rehabRoi: String(Math.round(rehabRoi * 100) / 100),
      rentToValue: String(Math.round(rentToValue * 10000) / 10000),
      grm: String(Math.round(grm * 100) / 100),
      meta: { strategySpecific: result.strategySpecific, grossYield: result.grossYield, netYield: result.netYield, arvSpread: result.arvSpread, cashNeeded: result.cashNeeded, monthlyDebtService: result.monthlyDebtService },
    };

    let metrics;
    if (existingMetrics.length > 0) {
      [metrics] = await db.update(reDealMetrics)
        .set({ ...metricsValues, computedAt: new Date() })
        .where(eq(reDealMetrics.scenarioId, scenarioId))
        .returning();
    } else {
      [metrics] = await db.insert(reDealMetrics)
        .values(metricsValues)
        .returning();
    }

    if (result.riskFlags.length > 0) {
      await db.insert(reRiskFlags).values(
        result.riskFlags.map(flag => ({
          scenarioId,
          flagType: flag.flagType,
          severity: flag.severity as any,
          message: flag.message,
          detail: flag.detail || null,
          isResolved: false,
        }))
      );
    }

    await db.update(reDeals)
      .set({ status: 'underwriting', updatedAt: new Date() })
      .where(eq(reDeals.id, id));

    const riskFlags = await db.select().from(reRiskFlags)
      .where(eq(reRiskFlags.scenarioId, scenarioId));

    const criticalCount = result.riskFlags.filter(f => f.severity === 'critical').length;
    const highCount = result.riskFlags.filter(f => f.severity === 'high').length;
    const riskSummary = criticalCount > 0
      ? `${criticalCount} critical risk${criticalCount > 1 ? 's' : ''} detected`
      : highCount > 0
        ? `${highCount} high risk${highCount > 1 ? 's' : ''} detected`
        : result.riskFlags.length > 0
          ? `${result.riskFlags.length} risk flag${result.riskFlags.length > 1 ? 's' : ''} noted`
          : 'No significant risks detected';

    await db.insert(reDecisionLog).values({
      dealId: id as string,
      decision: 'UNDERWRITING_COMPUTED',
      decidedBy: 'system',
      rationale: `Scenario "${scenario.name}" underwriting complete. Cap Rate: ${result.capRate.toFixed(2)}%, Cash-on-Cash: ${result.cashOnCash.toFixed(2)}%, DSCR: ${result.dscr.toFixed(2)}. ${riskSummary}.`,
      snapshotMetrics: {
        noi: result.noiAnnual,
        capRate: result.capRate,
        cashOnCash: result.cashOnCash,
        dscr: result.dscr,
        cashNeeded: result.cashNeeded,
        riskCount: result.riskFlags.length,
        criticalRisks: criticalCount,
        scenarioName: scenario.name,
      },
    });

    return successResponse(res, {
      metrics,
      riskFlags,
      summary: {
        noiAnnual: result.noiAnnual,
        capRate: result.capRate,
        cashOnCash: result.cashOnCash,
        dscr: result.dscr,
        cashNeeded: result.cashNeeded,
        monthlyDebtService: result.monthlyDebtService,
        arvSpread: result.arvSpread,
        breakEvenRent: result.breakEvenRent,
        totalProjectCost: result.totalProjectCost,
        riskCount: result.riskFlags.length,
        criticalRisks: result.riskFlags.filter(f => f.severity === 'critical').length,
        strategySpecific: result.strategySpecific,
      },
    }, buildMeta(['internal_db', 'derived_computation'], 1.0));

  } catch (err: any) {
    console.error('Recompute error:', err.message);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to recompute deal metrics');
  }
}
