export interface UnderwritingAssumptions {
  purchase_price: number;
  rehab_budget: number;
  arv_estimate: number;
  down_payment_pct: number;
  interest_rate: number;
  loan_term_years: number;
  closing_cost_pct: number;
  monthly_rent: number;
  vacancy_pct: number;
  property_mgmt_pct: number;
  annual_insurance: number;
  annual_taxes: number;
  annual_capex: number;
  annual_maintenance: number;
  hold_period_months: number;
  appreciation_pct: number;
}

export interface RiskFlag {
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
}

export interface UnderwritingResult {
  cash_needed: number;
  monthly_debt_service: number;
  dscr: number;
  noi_annual: number;
  cap_rate: number;
  cash_on_cash: number;
  break_even_rent: number;
  arv_spread: number;
  risk_flags: RiskFlag[];
  extra: Record<string, number>;
}

export const DSCR_NOT_APPLICABLE = Number.MAX_SAFE_INTEGER;

export function calcMonthlyPayment(principal: number, annualRate: number, termYears: number): number {
  if (annualRate === 0) return principal / (termYears * 12);
  const r = annualRate / 12;
  const n = termYears * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function baseRiskFlags(a: UnderwritingAssumptions, dscr: number, coc: number): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (dscr < 1.0) {
    flags.push({ severity: 'critical', explanation: 'DSCR below 1.0 indicates negative debt coverage' });
  } else if (dscr < 1.2) {
    flags.push({ severity: 'high', explanation: 'DSCR below 1.2 indicates thin debt coverage margin' });
  }

  if (coc < 0) {
    flags.push({ severity: 'high', explanation: 'Negative cash-on-cash return' });
  }

  if (a.vacancy_pct > 15) {
    flags.push({ severity: 'medium', explanation: 'Vacancy rate above 15 percent may reduce projected income' });
  }

  if (a.interest_rate > 0.1) {
    flags.push({ severity: 'medium', explanation: 'Interest rate above 10 percent increases carrying costs' });
  }

  if (a.rehab_budget > a.purchase_price * 0.5) {
    flags.push({ severity: 'high', explanation: 'Rehab budget exceeds 50 percent of purchase price' });
  }

  return flags;
}
