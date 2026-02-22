import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { pool } from '../../../../../server/db';
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

    if (existingMetrics.length > 0) {
      await pool.query(
        `UPDATE re_deal_metrics SET noi=$1, cap_rate=$2, cash_on_cash=$3, dscr=$4, 
         monthly_cash_flow=$5, annual_cash_flow=$6, break_even_months=$7, 
         rehab_roi=$8, rent_to_value=$9, grm=$10, meta=$11, computed_at=now()
         WHERE scenario_id=$12`,
        [metricsValues.noi, metricsValues.capRate, metricsValues.cashOnCash, metricsValues.dscr,
         metricsValues.monthlyCashFlow, metricsValues.annualCashFlow, metricsValues.breakEvenMonths,
         metricsValues.rehabRoi, metricsValues.rentToValue, metricsValues.grm,
         JSON.stringify(metricsValues.meta), scenarioId]
      );
    } else {
      await pool.query(
        `INSERT INTO re_deal_metrics (id, scenario_id, noi, cap_rate, cash_on_cash, dscr,
         monthly_cash_flow, annual_cash_flow, break_even_months, rehab_roi, rent_to_value,
         grm, meta, computed_at, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now())`,
        [scenarioId, metricsValues.noi, metricsValues.capRate, metricsValues.cashOnCash, metricsValues.dscr,
         metricsValues.monthlyCashFlow, metricsValues.annualCashFlow, metricsValues.breakEvenMonths,
         metricsValues.rehabRoi, metricsValues.rentToValue, metricsValues.grm,
         JSON.stringify(metricsValues.meta)]
      );
    }
    const [metrics] = await db.select().from(reDealMetrics)
      .where(eq(reDealMetrics.scenarioId, scenarioId)).limit(1);

    for (const flag of result.riskFlags) {
      await pool.query(
        `INSERT INTO re_risk_flags (id, scenario_id, flag_type, severity, message, detail, is_resolved, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, false, now())`,
        [scenarioId, flag.flagType, flag.severity, flag.message, flag.detail || null]
      );
    }

    await pool.query(
      `UPDATE re_deals SET status='underwriting', updated_at=now() WHERE id=$1`,
      [id]
    );

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

    await pool.query(
      `INSERT INTO re_decision_log (id, deal_id, decision, decided_by, rationale, snapshot_metrics, decided_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, now())`,
      [id, 'UNDERWRITING_COMPUTED', 'system',
       `Scenario "${scenario.scenarioName}" underwriting complete. Cap Rate: ${result.capRate.toFixed(2)}%, Cash-on-Cash: ${result.cashOnCash.toFixed(2)}%, DSCR: ${result.dscr.toFixed(2)}. ${riskSummary}.`,
       JSON.stringify({
         noi: result.noiAnnual, capRate: result.capRate, cashOnCash: result.cashOnCash,
         dscr: result.dscr, cashNeeded: result.cashNeeded, riskCount: result.riskFlags.length,
         criticalRisks: criticalCount, scenarioName: scenario.scenarioName,
       })]
    );

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
    console.error('Recompute error:', err.message, err.stack);
    return errorResponse(res, 500, 'INTERNAL_ERROR', `Failed to recompute deal metrics: ${err.message || 'Unknown error'}`);
  }
}
