import {
  UnderwritingAssumptions,
  UnderwritingResult,
  calcMonthlyPayment,
  baseRiskFlags,
  RiskFlag,
} from './base';

export function computeBrrrr(a: UnderwritingAssumptions): UnderwritingResult {
  const loanAmount = (a.purchase_price + a.rehab_budget) * (1 - a.down_payment_pct / 100);
  const closingCosts = a.purchase_price * (a.closing_cost_pct / 100);
  const cashNeeded = a.purchase_price * (a.down_payment_pct / 100) + a.rehab_budget + closingCosts;

  const monthlyDebtService = calcMonthlyPayment(loanAmount, a.interest_rate / 100, a.loan_term_years);
  const annualDebtService = monthlyDebtService * 12;

  const grossRentAnnual = a.monthly_rent * 12;
  const effectiveIncome = grossRentAnnual * (1 - a.vacancy_pct / 100);
  const operatingExpenses =
    a.annual_insurance +
    a.annual_taxes +
    a.annual_capex +
    a.annual_maintenance +
    grossRentAnnual * (a.property_mgmt_pct / 100);

  const noiAnnual = effectiveIncome - operatingExpenses;
  const capRate = a.arv_estimate > 0 ? noiAnnual / a.arv_estimate : 0;
  const annualCashFlow = noiAnnual - annualDebtService;
  const cashOnCash = cashNeeded > 0 ? annualCashFlow / cashNeeded : 0;
  const dscr = annualDebtService > 0 ? noiAnnual / annualDebtService : 0;
  const arvSpread = a.arv_estimate - (a.purchase_price + a.rehab_budget);

  const breakEvenRent =
    a.monthly_rent > 0
      ? (operatingExpenses / 12 + monthlyDebtService) / (1 - a.vacancy_pct / 100)
      : 0;

  const refiLoan = a.arv_estimate * 0.75;
  const cashOut = refiLoan - loanAmount;

  const flags: RiskFlag[] = baseRiskFlags(a, dscr, cashOnCash);
  if (arvSpread < 0) {
    flags.push({ severity: 'critical', explanation: 'ARV is below total acquisition cost - no equity spread' });
  }
  if (cashOut < 0) {
    flags.push({ severity: 'high', explanation: 'Refinance at 75 percent LTV does not recover initial cash investment' });
  }

  return {
    cash_needed: cashNeeded,
    monthly_debt_service: monthlyDebtService,
    dscr,
    noi_annual: noiAnnual,
    cap_rate: capRate,
    cash_on_cash: cashOnCash,
    break_even_rent: breakEvenRent,
    arv_spread: arvSpread,
    risk_flags: flags,
    extra: {
      refi_loan: refiLoan,
      cash_out: cashOut,
      annual_cash_flow: annualCashFlow,
      effective_income: effectiveIncome,
    },
  };
}
