import {
  UnderwritingAssumptions,
  UnderwritingResult,
  calcMonthlyPayment,
  baseRiskFlags,
  RiskFlag,
} from './base';

export function computeSellerFinance(a: UnderwritingAssumptions): UnderwritingResult {
  const downPayment = a.purchase_price * (a.down_payment_pct / 100);
  const closingCosts = a.purchase_price * (a.closing_cost_pct / 100);
  const cashNeeded = downPayment + closingCosts + a.rehab_budget;

  const sellerNoteAmount = a.purchase_price - downPayment;
  const sellerRate = a.interest_rate / 100;
  const sellerTermYears = a.loan_term_years;
  const monthlyDebtService = calcMonthlyPayment(sellerNoteAmount, sellerRate, sellerTermYears);
  const annualDebtService = monthlyDebtService * 12;

  const totalPayments = monthlyDebtService * sellerTermYears * 12;
  const totalInterestPaid = totalPayments - sellerNoteAmount;

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
    a.monthly_rent > 0
      ? (operatingExpenses / 12 + monthlyDebtService) / (1 - a.vacancy_pct / 100)
      : 0;

  const noteSpread = sellerRate - 0.05;
  const effectiveYield = cashNeeded > 0 ? annualCashFlow / cashNeeded : 0;

  const balloonMonths = Math.min(sellerTermYears * 12, a.hold_period_months || 60);
  const remainingMonths = sellerTermYears * 12 - balloonMonths;
  let balloonBalance = sellerNoteAmount;
  if (sellerRate > 0) {
    const r = sellerRate / 12;
    const n = sellerTermYears * 12;
    const paid = balloonMonths;
    balloonBalance = sellerNoteAmount * (Math.pow(1 + r, paid) - ((Math.pow(1 + r, paid) - 1) / ((Math.pow(1 + r, n) - 1)))) || sellerNoteAmount * (1 - paid / n);
  }

  const equityAtBalloon = a.arv_estimate - balloonBalance;
  const ltv = a.arv_estimate > 0 ? sellerNoteAmount / a.arv_estimate : 1;

  const flags: RiskFlag[] = baseRiskFlags(a, dscr, cashOnCash);

  if (sellerRate > 0.10) {
    flags.push({ severity: 'high', explanation: 'Seller financing rate above 10 percent — elevated carrying cost' });
  }

  if (sellerTermYears < 5) {
    flags.push({ severity: 'medium', explanation: 'Seller note term under 5 years — balloon refinance risk' });
  }

  if (ltv > 0.9) {
    flags.push({ severity: 'medium', explanation: 'Loan-to-value above 90 percent on seller note' });
  }

  if (noteSpread < 0) {
    flags.push({ severity: 'low', explanation: 'Seller note rate below conventional market rate — favorable terms' });
  }

  if (annualCashFlow < 0) {
    flags.push({ severity: 'high', explanation: 'Negative cash flow under seller financing terms' });
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
      seller_note_amount: sellerNoteAmount,
      total_interest_paid: totalInterestPaid,
      note_spread_vs_conventional: noteSpread,
      effective_yield: effectiveYield,
      annual_cash_flow: annualCashFlow,
      effective_income: effectiveIncome,
      balloon_balance: balloonBalance,
      equity_at_balloon: equityAtBalloon,
      ltv,
    },
  };
}
