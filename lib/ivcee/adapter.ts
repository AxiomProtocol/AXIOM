import { pool } from '../../server/db';
import type { IVCEEInput } from './models';

export async function loadIVCEEInput(dealId: string, scenarioId: string): Promise<IVCEEInput> {
  const metricsResult = await pool.query(
    `SELECT noi, cap_rate, cash_on_cash, dscr, monthly_cash_flow, annual_cash_flow,
            rehab_roi, rent_to_value, grm
     FROM re_deal_metrics WHERE scenario_id = $1 LIMIT 1`,
    [scenarioId]
  );
  if (metricsResult.rows.length === 0) {
    throw new Error('No underwriting metrics found for this scenario');
  }
  const m = metricsResult.rows[0];

  const assumptionsResult = await pool.query(
    `SELECT purchase_price, rehab_budget, arv_estimate, down_payment_pct,
            interest_rate, loan_term_years, monthly_rent, vacancy_pct,
            property_mgmt_pct, annual_insurance, annual_taxes,
            annual_capex, annual_maintenance
     FROM re_deal_assumptions WHERE scenario_id = $1 LIMIT 1`,
    [scenarioId]
  );
  if (assumptionsResult.rows.length === 0) {
    throw new Error('No underwriting assumptions found for this scenario');
  }
  const a = assumptionsResult.rows[0];

  return {
    dealId,
    scenarioId,
    purchasePrice: num(a.purchase_price),
    arvEstimate: num(a.arv_estimate),
    rehabBudget: num(a.rehab_budget),
    downPaymentPct: pct(a.down_payment_pct),
    interestRate: pct(a.interest_rate),
    loanTermYears: parseInt(a.loan_term_years) || 30,
    monthlyRent: num(a.monthly_rent),
    vacancyPct: pct(a.vacancy_pct),
    propertyMgmtPct: pct(a.property_mgmt_pct),
    annualInsurance: num(a.annual_insurance),
    annualTaxes: num(a.annual_taxes),
    annualCapex: num(a.annual_capex || 0),
    annualMaintenance: num(a.annual_maintenance || 0),
    noi: num(m.noi),
    capRate: num(m.cap_rate),
    cashOnCash: num(m.cash_on_cash),
    dscr: num(m.dscr),
    monthlyCashFlow: num(m.monthly_cash_flow),
    annualCashFlow: num(m.annual_cash_flow),
    rehabRoi: num(m.rehab_roi),
    rentToValue: num(m.rent_to_value),
    grm: num(m.grm),
    confidenceScore: 0.7,
  };
}

export async function getDefaultScenarioId(dealId: string): Promise<string | null> {
  const result = await pool.query(
    `SELECT scenario_id FROM re_deal_assumptions
     WHERE scenario_id IN (SELECT id FROM re_deal_scenarios WHERE deal_id = $1)
     ORDER BY created_at DESC LIMIT 1`,
    [dealId]
  );
  if (result.rows.length === 0) {
    const fallback = await pool.query(
      `SELECT DISTINCT scenario_id FROM re_deal_assumptions LIMIT 1`
    );
    return fallback.rows[0]?.scenario_id || null;
  }
  return result.rows[0].scenario_id;
}

function num(val: any): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function pct(val: any): number {
  const n = parseFloat(val);
  if (isNaN(n)) return 0;
  return n > 1 ? n / 100 : n;
}
