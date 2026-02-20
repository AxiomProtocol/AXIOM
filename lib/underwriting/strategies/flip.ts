import {
  UnderwritingAssumptions,
  UnderwritingResult,
  baseRiskFlags,
  RiskFlag,
  DSCR_NOT_APPLICABLE,
} from './base';

export function computeFlip(a: UnderwritingAssumptions): UnderwritingResult {
  const closingCosts = a.purchase_price * (a.closing_cost_pct / 100);
  const sellingCosts = a.arv_estimate * 0.08;
  const cashNeeded = a.purchase_price + a.rehab_budget + closingCosts;
  const holdingCosts =
    ((a.annual_insurance + a.annual_taxes + a.annual_maintenance) * a.hold_period_months) / 12;

  const grossProfit = a.arv_estimate - a.purchase_price - a.rehab_budget - closingCosts - sellingCosts - holdingCosts;
  const roi = cashNeeded > 0 ? grossProfit / cashNeeded : 0;

  const noiAnnual = grossProfit / (a.hold_period_months / 12);
  const capRate = cashNeeded > 0 ? noiAnnual / cashNeeded : 0;
  const arvSpread = a.arv_estimate - (a.purchase_price + a.rehab_budget);
  const breakEvenRent = 0;
  const dscr = 0;
  const monthlyDebtService = 0;

  const flags: RiskFlag[] = baseRiskFlags(a, DSCR_NOT_APPLICABLE, roi);
  if (grossProfit < 0) {
    flags.push({ severity: 'critical', explanation: 'Projected flip profit is negative after all costs' });
  }
  if (roi < 0.15) {
    flags.push({ severity: 'medium', explanation: 'Projected ROI below 15 percent for a flip strategy' });
  }
  if (a.hold_period_months > 12) {
    flags.push({ severity: 'low', explanation: 'Hold period exceeds 12 months, increasing carrying cost exposure' });
  }

  return {
    cash_needed: cashNeeded,
    monthly_debt_service: monthlyDebtService,
    dscr,
    noi_annual: noiAnnual,
    cap_rate: capRate,
    cash_on_cash: roi,
    break_even_rent: breakEvenRent,
    arv_spread: arvSpread,
    risk_flags: flags,
    extra: {
      gross_profit: grossProfit,
      selling_costs: sellingCosts,
      holding_costs: holdingCosts,
      roi,
    },
  };
}
