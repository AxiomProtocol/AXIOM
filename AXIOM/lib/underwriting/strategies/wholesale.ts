import {
  UnderwritingAssumptions,
  UnderwritingResult,
  baseRiskFlags,
  RiskFlag,
  DSCR_NOT_APPLICABLE,
} from './base';

export function computeWholesale(a: UnderwritingAssumptions): UnderwritingResult {
  const closingCosts = a.purchase_price * (a.closing_cost_pct / 100);
  const earnestMoney = a.purchase_price * 0.01;
  const marketingCost = 500;
  const cashNeeded = earnestMoney + marketingCost + closingCosts;

  const assignmentFee = a.arv_estimate - a.purchase_price - a.rehab_budget;
  const conservativeAssignment = assignmentFee * 0.7;
  const spreadPercent = a.purchase_price > 0 ? assignmentFee / a.purchase_price : 0;

  const timeToCloseMonths = Math.min(a.hold_period_months || 2, 3);
  const annualizedReturn = cashNeeded > 0
    ? (assignmentFee / cashNeeded) * (12 / timeToCloseMonths)
    : 0;

  const roi = cashNeeded > 0 ? assignmentFee / cashNeeded : 0;

  const flags: RiskFlag[] = [];

  if (assignmentFee < 5000) {
    flags.push({ severity: 'critical', explanation: 'Assignment fee below 5000 — deal may not be worth pursuing' });
  } else if (assignmentFee < 10000) {
    flags.push({ severity: 'medium', explanation: 'Assignment fee below 10000 — thin margin for wholesale deal' });
  }

  if (spreadPercent < 0.05) {
    flags.push({ severity: 'high', explanation: 'Spread below 5 percent of purchase price — buyer may not see value' });
  }

  if (a.rehab_budget > a.arv_estimate * 0.3) {
    flags.push({ severity: 'medium', explanation: 'High rehab-to-ARV ratio may reduce buyer interest' });
  }

  if (a.purchase_price > a.arv_estimate * 0.75) {
    flags.push({ severity: 'high', explanation: 'Purchase price above 75 percent of ARV — insufficient margin for end buyer' });
  }

  return {
    cash_needed: cashNeeded,
    monthly_debt_service: 0,
    dscr: DSCR_NOT_APPLICABLE,
    noi_annual: 0,
    cap_rate: 0,
    cash_on_cash: roi,
    break_even_rent: 0,
    arv_spread: a.arv_estimate - a.purchase_price,
    risk_flags: flags,
    extra: {
      assignment_fee: assignmentFee,
      conservative_assignment: conservativeAssignment,
      spread_percent: spreadPercent,
      earnest_money: earnestMoney,
      marketing_cost: marketingCost,
      time_to_close_months: timeToCloseMonths,
      annualized_return: annualizedReturn,
      roi,
    },
  };
}
