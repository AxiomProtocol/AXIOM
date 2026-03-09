import {
  UnderwritingAssumptions,
  UnderwritingResult,
  calcMonthlyPayment,
  baseRiskFlags,
  RiskFlag,
} from './base';

export function computeSTR(a: UnderwritingAssumptions): UnderwritingResult {
  const downPayment = a.purchase_price * (a.down_payment_pct / 100);
  const loanAmount = a.purchase_price - downPayment;
  const closingCosts = a.purchase_price * (a.closing_cost_pct / 100);
  const furnishingCost = a.rehab_budget;
  const cashNeeded = downPayment + closingCosts + furnishingCost;

  const monthlyDebtService = calcMonthlyPayment(loanAmount, a.interest_rate / 100, a.loan_term_years);
  const annualDebtService = monthlyDebtService * 12;

  const estimatedNightlyRate = a.monthly_rent / 20;
  const avgOccupancyPct = 100 - a.vacancy_pct;
  const nightsPerYear = 365 * (avgOccupancyPct / 100);
  const grossRevenue = estimatedNightlyRate * nightsPerYear;

  const platformFeePct = 0.15;
  const managementPct = a.property_mgmt_pct > 0 ? a.property_mgmt_pct / 100 : 0.20;
  const cleaningPerTurnover = 150;
  const turnoversPerYear = nightsPerYear / 3;
  const cleaningCosts = cleaningPerTurnover * turnoversPerYear;
  const suppliesCost = grossRevenue * 0.05;

  const platformFees = grossRevenue * platformFeePct;
  const managementFees = grossRevenue * managementPct;

  const operatingExpenses =
    a.annual_insurance +
    a.annual_taxes +
    a.annual_capex +
    a.annual_maintenance +
    platformFees +
    managementFees +
    cleaningCosts +
    suppliesCost;

  const noiAnnual = grossRevenue - operatingExpenses;
  const capRate = a.purchase_price > 0 ? noiAnnual / a.purchase_price : 0;
  const annualCashFlow = noiAnnual - annualDebtService;
  const cashOnCash = cashNeeded > 0 ? annualCashFlow / cashNeeded : 0;
  const dscr = annualDebtService > 0 ? noiAnnual / annualDebtService : 0;
  const arvSpread = a.arv_estimate - a.purchase_price;

  const breakEvenOccupancy = grossRevenue > 0
    ? ((operatingExpenses + annualDebtService) / grossRevenue) * 100
    : 100;
  const breakEvenRent =
    (operatingExpenses / 12 + monthlyDebtService) / (1 - a.vacancy_pct / 100);

  const revenuePerSqft = a.monthly_rent > 0 ? grossRevenue / (a.monthly_rent * 12) : 0;

  const flags: RiskFlag[] = baseRiskFlags(a, dscr, cashOnCash);

  if (avgOccupancyPct < 50) {
    flags.push({ severity: 'high', explanation: 'STR occupancy below 50 percent — revenue risk is elevated' });
  }

  if (breakEvenOccupancy > 70) {
    flags.push({ severity: 'medium', explanation: 'Break-even occupancy above 70 percent — thin margin for STR' });
  }

  if (platformFees + managementFees > grossRevenue * 0.4) {
    flags.push({ severity: 'medium', explanation: 'Platform and management fees exceed 40 percent of gross revenue' });
  }

  if (revenuePerSqft > 2.5) {
    flags.push({ severity: 'low', explanation: 'STR revenue premium above 2.5x long-term rental — verify market supports pricing' });
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
      gross_revenue: grossRevenue,
      nightly_rate: estimatedNightlyRate,
      avg_occupancy_pct: avgOccupancyPct,
      nights_per_year: nightsPerYear,
      platform_fees: platformFees,
      management_fees: managementFees,
      cleaning_costs: cleaningCosts,
      annual_cash_flow: annualCashFlow,
      break_even_occupancy: breakEvenOccupancy,
      furnishing_cost: furnishingCost,
      revenue_vs_ltr_multiple: revenuePerSqft,
    },
  };
}
