import type { NextApiRequest, NextApiResponse } from 'next';
import { db, pool } from '../../../../../server/db';
import { reDealScenarios, reDealAssumptions, reDealMetrics, reRiskFlags } from '../../../../../shared/realEstateSchema';
import { eq } from 'drizzle-orm';
import { computeUnderwriting } from '../../../../../server/services/real-estate/underwriting';
import { successResponse, errorResponse, buildMeta, parseNumeric, safeNum, safeInt } from '../../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only POST is accepted');
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return errorResponse(res, 400, 'INVALID_ID', 'Deal ID is required');
  }

  let debugMetrics: Record<string, unknown> = {};
  try {
    const { scenarioId } = req.body;
    if (!scenarioId || typeof scenarioId !== 'string') {
      return errorResponse(res, 400, 'INVALID_PARAMS', 'scenarioId is required');
    }

    const dealCheck = await pool.query(`SELECT id, strategy FROM re_deals WHERE id = $1`, [id]);
    if (dealCheck.rows.length === 0) {
      return errorResponse(res, 404, 'DEAL_NOT_FOUND', 'Deal does not exist');
    }
    const deal = dealCheck.rows[0];

    const scenarioCheck = await pool.query(
      `SELECT id, deal_id, scenario_name FROM re_deal_scenarios WHERE id = $1`, [scenarioId]
    );
    if (scenarioCheck.rows.length === 0 || scenarioCheck.rows[0].deal_id !== id) {
      return errorResponse(res, 404, 'SCENARIO_NOT_FOUND', 'Scenario not found for this deal');
    }
    const scenario = scenarioCheck.rows[0];

    const assumptionCheck = await pool.query(
      `SELECT * FROM re_deal_assumptions WHERE scenario_id = $1 LIMIT 1`, [scenarioId]
    );
    if (assumptionCheck.rows.length === 0) {
      return errorResponse(res, 400, 'NO_ASSUMPTIONS', 'No assumptions found for this scenario. Save assumptions first.');
    }
    const assumptions = assumptionCheck.rows[0];

    const p = (v: string | number | null | undefined) => parseNumeric(v);

    const purchasePrice = p(assumptions.purchase_price);
    const arvEstimate = p(assumptions.arv_estimate);
    const closingCostPct = p(assumptions.closing_cost_pct);
    const downPaymentPct = p(assumptions.down_payment_pct);
    const closingCostBuy = closingCostPct * purchasePrice / 100;
    const closingCostSell = closingCostPct * arvEstimate / 100;
    const loanAmount = purchasePrice * (1 - downPaymentPct / 100);
    const holdPeriodMonths = p(assumptions.hold_period_months);
    const monthlyHoldingCost = (p(assumptions.annual_insurance) + p(assumptions.annual_taxes) + p(assumptions.annual_maintenance)) / 12;

    const result = computeUnderwriting({
      strategy: deal.strategy as any,
      assumptions: {
        purchasePrice,
        afterRepairValue: arvEstimate,
        rehabCost: p(assumptions.rehab_budget),
        closingCostBuy,
        closingCostSell,
        holdingCostMonthly: monthlyHoldingCost,
        holdingPeriodMonths: holdPeriodMonths,
        loanAmount,
        interestRate: p(assumptions.interest_rate),
        loanTermYears: p(assumptions.loan_term_years),
        monthlyRent: p(assumptions.monthly_rent),
        vacancyRate: p(assumptions.vacancy_pct),
        propertyTaxAnnual: p(assumptions.annual_taxes),
        insuranceAnnual: p(assumptions.annual_insurance),
        maintenanceAnnual: p(assumptions.annual_maintenance),
        managementRate: p(assumptions.property_mgmt_pct),
        unitCount: 1,
      },
    });

    await pool.query(`DELETE FROM re_risk_flags WHERE scenario_id = $1`, [scenarioId]);

    const existingMetrics = await pool.query(
      `SELECT id FROM re_deal_metrics WHERE scenario_id = $1 LIMIT 1`, [scenarioId]
    );

    const annualCashFlow = result.noiAnnual - (result.monthlyDebtService * 12);
    const rehabCost = p(assumptions.rehab_budget);
    const rehabRoi = rehabCost > 0 ? ((arvEstimate - purchasePrice - rehabCost) / rehabCost) * 100 : 0;
    const grossRentalIncome = p(assumptions.monthly_rent) * 12;
    const rentToValue = purchasePrice > 0 ? (p(assumptions.monthly_rent) / purchasePrice) * 100 : 0;
    const grm = grossRentalIncome > 0 ? purchasePrice / grossRentalIncome : 0;
    const rawBreakEven = annualCashFlow > 0 ? Math.ceil(result.cashNeeded / (annualCashFlow / 12)) : null;
    const breakEvenMonths = safeInt(rawBreakEven, 100000);

    const noi = safeNum(result.noiAnnual, 2, 12);
    const capRate = safeNum(result.capRate, 4, 4);
    const cashOnCash = safeNum(result.cashOnCash, 4, 4);
    const dscr = safeNum(result.dscr, 4, 4);
    const mCashFlow = safeNum(annualCashFlow / 12, 2, 8);
    const aCashFlow = safeNum(annualCashFlow, 2, 10);
    const rRoi = safeNum(rehabRoi, 4, 4);
    const rToV = safeNum(rentToValue, 4, 4);
    const grmVal = safeNum(grm, 2, 6);
    const metaJson = JSON.stringify({
      strategySpecific: result.strategySpecific,
      grossYield: result.grossYield, netYield: result.netYield,
      arvSpread: result.arvSpread, cashNeeded: result.cashNeeded,
      monthlyDebtService: result.monthlyDebtService,
    });

    debugMetrics = { noi, capRate, cashOnCash, dscr, mCashFlow, aCashFlow, breakEvenMonths, rRoi, rToV, grmVal };

    if (existingMetrics.rows.length > 0) {
      await pool.query(
        `UPDATE re_deal_metrics SET noi=$1, cap_rate=$2, cash_on_cash=$3, dscr=$4,
         monthly_cash_flow=$5, annual_cash_flow=$6, break_even_months=$7,
         rehab_roi=$8, rent_to_value=$9, grm=$10, meta=$11, computed_at=now()
         WHERE scenario_id=$12`,
        [noi, capRate, cashOnCash, dscr, mCashFlow, aCashFlow, breakEvenMonths,
         rRoi, rToV, grmVal, metaJson, scenarioId]
      );
    } else {
      await pool.query(
        `INSERT INTO re_deal_metrics (id, scenario_id, noi, cap_rate, cash_on_cash, dscr,
         monthly_cash_flow, annual_cash_flow, break_even_months, rehab_roi, rent_to_value,
         grm, meta, computed_at, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now())`,
        [scenarioId, noi, capRate, cashOnCash, dscr, mCashFlow, aCashFlow, breakEvenMonths,
         rRoi, rToV, grmVal, metaJson]
      );
    }

    const metricsResult = await pool.query(
      `SELECT * FROM re_deal_metrics WHERE scenario_id = $1 LIMIT 1`, [scenarioId]
    );
    const metrics = metricsResult.rows[0];

    for (const flag of result.riskFlags) {
      await pool.query(
        `INSERT INTO re_risk_flags (id, scenario_id, flag_type, severity, message, detail, is_resolved, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, false, now())`,
        [scenarioId, flag.flagType, flag.severity, flag.message, flag.detail ? JSON.stringify(flag.detail) : null]
      );
    }

    await pool.query(
      `UPDATE re_deals SET status='underwriting', updated_at=now() WHERE id=$1`, [id]
    );

    const riskFlagsResult = await pool.query(
      `SELECT * FROM re_risk_flags WHERE scenario_id = $1`, [scenarioId]
    );

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
       `Scenario "${scenario.scenario_name}" underwriting complete. Cap Rate: ${result.capRate.toFixed(2)}%, Cash-on-Cash: ${result.cashOnCash.toFixed(2)}%, DSCR: ${result.dscr.toFixed(2)}. ${riskSummary}.`,
       JSON.stringify({
         noi: result.noiAnnual, capRate: result.capRate, cashOnCash: result.cashOnCash,
         dscr: result.dscr, cashNeeded: result.cashNeeded, riskCount: result.riskFlags.length,
         criticalRisks: criticalCount, scenarioName: scenario.scenario_name,
       })]
    );

    return successResponse(res, {
      metrics,
      riskFlags: riskFlagsResult.rows,
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
        criticalRisks: criticalCount,
        strategySpecific: result.strategySpecific,
      },
    }, buildMeta(['internal_db', 'derived_computation'], 1.0));

  } catch (err: any) {
    console.error('Recompute error:', err.message, err.stack);
    console.error('Recompute debug: dealId=', id, 'scenarioId=', req.body?.scenarioId,
      'computed values:', JSON.stringify(debugMetrics));
    return errorResponse(res, 500, 'INTERNAL_ERROR', `Failed to recompute deal metrics: ${err.message || 'Unknown error'}`);
  }
}
