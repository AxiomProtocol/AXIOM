import {
  UnderwritingAssumptions,
  UnderwritingResult,
  calcMonthlyPayment,
  baseRiskFlags,
  RiskFlag,
  DSCR_NOT_APPLICABLE,
} from './base';

export function computeNote(a: UnderwritingAssumptions): UnderwritingResult {
  const noteAmount = a.purchase_price;
  const monthlyPayment = calcMonthlyPayment(noteAmount, a.interest_rate / 100, a.loan_term_years);
  const annualIncome = monthlyPayment * 12;
  const cashNeeded = noteAmount * (a.down_payment_pct / 100);
  const noiAnnual = annualIncome - a.annual_insurance - a.annual_maintenance;
  const capRate = noteAmount > 0 ? noiAnnual / noteAmount : 0;
  const cashOnCash = cashNeeded > 0 ? noiAnnual / cashNeeded : 0;
  const dscr = 0;
  const arvSpread = a.arv_estimate - noteAmount;

  const breakEvenRent = 0;

  const flags: RiskFlag[] = baseRiskFlags(a, DSCR_NOT_APPLICABLE, cashOnCash);
  if (a.interest_rate < 0.06) {
    flags.push({ severity: 'low', explanation: 'Note rate below 6 percent reduces yield on investment' });
  }
  if (arvSpread < 0) {
    flags.push({ severity: 'high', explanation: 'Note face value exceeds estimated ARV - collateral deficit risk' });
  }

  return {
    cash_needed: cashNeeded,
    monthly_debt_service: 0,
    dscr,
    noi_annual: noiAnnual,
    cap_rate: capRate,
    cash_on_cash: cashOnCash,
    break_even_rent: breakEvenRent,
    arv_spread: arvSpread,
    risk_flags: flags,
    extra: {
      note_amount: noteAmount,
      monthly_payment: monthlyPayment,
      annual_income: annualIncome,
    },
  };
}
