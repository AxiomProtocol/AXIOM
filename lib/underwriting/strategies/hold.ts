import {
  UnderwritingAssumptions,
  UnderwritingResult,
  calcMonthlyPayment,
  baseRiskFlags,
  RiskFlag,
} from './base';

export function computeHold(a: UnderwritingAssumptions): UnderwritingResult {
  const downPayment = a.purchase_price * (a.down_payment_pct / 100);
  const loanAmount = a.purchase_price - downPayment;
  const closingCosts = a.purchase_price * (a.closing_cost_pct / 100);
  const cashNeeded = downPayment + closingCosts;

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
  const capRate = a.purchase_price > 0 ? noiAnnual / a.purchase_price : 0;
  const annualCashFlow = noiAnnual - annualDebtService;
  const cashOnCash = cashNeeded > 0 ? annualCashFlow / cashNeeded : 0;
  const dscr = annualDebtService > 0 ? noiAnnual / annualDebtService : 0;
  const arvSpread = a.arv_estimate - a.purchase_price;

  const breakEvenRent =
    (operatingExpenses / 12 + monthlyDebtService) / (1 - a.vacancy_pct / 100);

  const holdYears = a.hold_period_months / 12;
  const futureValue = a.purchase_price * Math.pow(1 + a.appreciation_pct / 100, holdYears);
  const totalReturn = futureValue - a.purchase_price + annualCashFlow * holdYears;

  const flags: RiskFlag[] = baseRiskFlags(a, dscr, cashOnCash);
  if (capRate < 0.05) {
    flags.push({ severity: 'medium', explanation: 'Cap rate below 5 percent may not justify acquisition cost' });
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
      annual_cash_flow: annualCashFlow,
      future_value: futureValue,
      total_return: totalReturn,
      effective_income: effectiveIncome,
    },
  };
}
