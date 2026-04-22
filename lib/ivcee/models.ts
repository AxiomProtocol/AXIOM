export interface IVCEEInput {
  dealId: string;
  scenarioId: string;
  purchasePrice: number;
  arvEstimate: number;
  rehabBudget: number;
  downPaymentPct: number;
  interestRate: number;
  loanTermYears: number;
  monthlyRent: number;
  vacancyPct: number;
  propertyMgmtPct: number;
  annualInsurance: number;
  annualTaxes: number;
  annualCapex: number;
  annualMaintenance: number;
  noi: number;
  capRate: number;
  cashOnCash: number;
  dscr: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  rehabRoi: number;
  rentToValue: number;
  grm: number;
  confidenceScore: number;
}

export interface ProbabilityResult {
  baseViabilityScore: number;
  viabilityProbability: number;
  failureProbability: number;
  dominantRiskFactor: string;
}

export interface SensitivityRow {
  priceDelta: number;
  rentDelta: number;
  rateDelta: number;
  dscrOutput: number;
  cashflowOutput: number;
  viabilityShift: number;
}

export interface StressTestResult {
  scenarioType: string;
  dscrStressed: number;
  cashflowStressed: number;
  drawdownProjection: number;
  survivalStatus: string;
}

export interface RefinanceRiskResult {
  refinanceLtv: number;
  refinanceDscr: number;
  equityExtracted: number;
  refinanceProbability: number;
  failureConditions: string;
}

export interface DownsideResult {
  breakEvenRent: number;
  breakEvenPrice: number;
  maxSafeLtv: number;
  marginOfSafety: number;
}

export interface CapitalEfficiencyResult {
  roiAdjusted: number;
  volatilityPenalty: number;
  leveragePenalty: number;
  efficiencyScore: number;
  capitalRank: number | null;
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function normalize(val: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return clamp((val - min) / (max - min), 0, 1);
}

export function computeProbabilityModel(input: IVCEEInput): ProbabilityResult {
  const normalizedDscr = normalize(input.dscr, 0.5, 2.0);
  const normalizedCashflow = normalize(input.annualCashFlow, -12000, 24000);
  const normalizedCaprate = normalize(input.capRate, 0, 0.12);
  const confidence = clamp(input.confidenceScore, 0, 1);

  const viabilityIndex =
    0.40 * normalizedDscr +
    0.25 * normalizedCashflow +
    0.20 * normalizedCaprate +
    0.15 * confidence;

  const scaledIndex = (viabilityIndex - 0.5) * 8;
  const viabilityProbability = sigmoid(scaledIndex);
  const failureProbability = 1 - viabilityProbability;

  const contributions: Record<string, number> = {
    'LOW_DSCR': 0.40 * (1 - normalizedDscr),
    'NEGATIVE_CASHFLOW': 0.25 * (1 - normalizedCashflow),
    'LOW_CAP_RATE': 0.20 * (1 - normalizedCaprate),
    'LOW_CONFIDENCE': 0.15 * (1 - confidence),
  };
  const dominantRiskFactor = Object.entries(contributions)
    .sort((a, b) => b[1] - a[1])[0][0];

  return {
    baseViabilityScore: round4(viabilityIndex),
    viabilityProbability: round4(viabilityProbability),
    failureProbability: round4(failureProbability),
    dominantRiskFactor,
  };
}

function computeDebtService(loanAmount: number, annualRate: number, termYears: number): number {
  if (loanAmount <= 0 || annualRate <= 0 || termYears <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const n = termYears * 12;
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n)) /
    (Math.pow(1 + monthlyRate, n) - 1);
  return monthlyPayment * 12;
}

function recomputeMetrics(
  input: IVCEEInput,
  overrides: { priceDelta?: number; rentDelta?: number; rateDelta?: number; vacancyOverride?: number }
): { dscr: number; annualCashFlow: number; noi: number; capRate: number } {
  const priceFactor = 1 + (overrides.priceDelta || 0);
  const rentFactor = 1 + (overrides.rentDelta || 0);
  const rateShift = overrides.rateDelta || 0;
  const vacancyPct = overrides.vacancyOverride !== undefined ? overrides.vacancyOverride : input.vacancyPct;

  const adjustedPrice = input.purchasePrice * priceFactor;
  const adjustedRent = input.monthlyRent * rentFactor;
  const adjustedRate = Math.max(0.001, input.interestRate + rateShift);

  const grossAnnualRent = adjustedRent * 12;
  const effectiveRent = grossAnnualRent * (1 - vacancyPct);
  const mgmtCost = effectiveRent * input.propertyMgmtPct;
  const opex = input.annualTaxes + input.annualInsurance + mgmtCost +
    (input.annualCapex || 0) + (input.annualMaintenance || 0);
  const noi = effectiveRent - opex;

  const downPayment = adjustedPrice * input.downPaymentPct;
  const loanAmount = adjustedPrice - downPayment;
  const annualDebtService = computeDebtService(loanAmount, adjustedRate, input.loanTermYears);

  const annualCashFlow = noi - annualDebtService;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : noi > 0 ? 99 : 0;
  const capRate = adjustedPrice > 0 ? noi / adjustedPrice : 0;

  return { dscr: round4(dscr), annualCashFlow: round2(annualCashFlow), noi: round2(noi), capRate: round4(capRate) };
}

export function computeSensitivityMatrix(input: IVCEEInput): SensitivityRow[] {
  const priceDeltas = [-0.20, -0.10, 0, 0.10, 0.20];
  const rentDeltas = [-0.20, -0.10, 0, 0.10, 0.20];
  const rateDeltas = [-0.03, -0.015, 0, 0.015, 0.03];
  const rows: SensitivityRow[] = [];

  for (const pd of priceDeltas) {
    for (const rd of rentDeltas) {
      for (const rtd of rateDeltas) {
        if (pd === 0 && rd === 0 && rtd === 0) continue;
        const m = recomputeMetrics(input, { priceDelta: pd, rentDelta: rd, rateDelta: rtd });
        const baseProb = computeProbabilityModel(input).baseViabilityScore;
        const shiftedInput = { ...input, dscr: m.dscr, annualCashFlow: m.annualCashFlow, capRate: m.capRate };
        const shiftedProb = computeProbabilityModel(shiftedInput).baseViabilityScore;
        rows.push({
          priceDelta: pd,
          rentDelta: rd,
          rateDelta: rtd,
          dscrOutput: m.dscr,
          cashflowOutput: m.annualCashFlow,
          viabilityShift: round4(shiftedProb - baseProb),
        });
      }
    }
  }

  return rows;
}

export function computeStressTests(input: IVCEEInput): StressTestResult[] {
  const scenarios: Array<{ type: string; overrides: Parameters<typeof recomputeMetrics>[1] }> = [
    { type: 'RECESSION', overrides: { rentDelta: -0.10, vacancyOverride: input.vacancyPct + 0.08 } },
    { type: 'RATE_SHOCK', overrides: { rateDelta: 0.02 } },
    { type: 'RENT_DROP', overrides: { rentDelta: -0.15 } },
    { type: 'VACANCY_SHOCK', overrides: { vacancyOverride: 0.20 } },
  ];

  return scenarios.map(s => {
    const m = recomputeMetrics(input, s.overrides);
    const drawdown = input.annualCashFlow !== 0
      ? round4((input.annualCashFlow - m.annualCashFlow) / Math.abs(input.annualCashFlow))
      : m.annualCashFlow < 0 ? 1.0 : 0;
    return {
      scenarioType: s.type,
      dscrStressed: m.dscr,
      cashflowStressed: m.annualCashFlow,
      drawdownProjection: drawdown,
      survivalStatus: m.dscr >= 1.0 ? 'SURVIVE' : 'FAIL',
    };
  });
}

export function computeRefinanceRisk(input: IVCEEInput): RefinanceRiskResult {
  const targetLtv = 0.75;
  const refiRate = input.interestRate + 0.005;
  const postRehabValue = input.arvEstimate;
  const maxLoan = postRehabValue * targetLtv;
  const currentLoan = input.purchasePrice * (1 - input.downPaymentPct);
  const equityExtracted = Math.max(0, maxLoan - currentLoan);

  const refiDebtService = computeDebtService(maxLoan, refiRate, input.loanTermYears);
  const refiDscr = refiDebtService > 0 ? input.noi / refiDebtService : 0;

  const failures: string[] = [];
  if (refiDscr < 1.0) failures.push('DSCR below 1.0 post-refinance');
  if (refiDscr < 1.25) failures.push('DSCR below lender minimum 1.25');
  if (targetLtv > 0.80) failures.push('LTV exceeds 80% threshold');
  if (equityExtracted <= 0) failures.push('No equity available to extract');

  let refiProbability: number;
  if (refiDscr >= 1.25 && targetLtv <= 0.75 && equityExtracted > 0) {
    refiProbability = 0.85;
  } else if (refiDscr >= 1.0 && targetLtv <= 0.80) {
    refiProbability = 0.55;
  } else {
    refiProbability = 0.15;
  }

  return {
    refinanceLtv: round4(targetLtv),
    refinanceDscr: round4(refiDscr),
    equityExtracted: round2(equityExtracted),
    refinanceProbability: round4(refiProbability),
    failureConditions: failures.length > 0 ? failures.join('; ') : 'NONE',
  };
}

export function computeDownsideMetrics(input: IVCEEInput): DownsideResult {
  const loanAmount = input.purchasePrice * (1 - input.downPaymentPct);
  const annualDebtService = computeDebtService(loanAmount, input.interestRate, input.loanTermYears);

  const fixedOpex = input.annualTaxes + input.annualInsurance +
    (input.annualCapex || 0) + (input.annualMaintenance || 0);
  const effectiveVacancy = 1 - input.vacancyPct;
  const mgmtFactor = 1 - input.propertyMgmtPct;

  const breakEvenAnnualRent = effectiveVacancy > 0 && mgmtFactor > 0
    ? (fixedOpex + annualDebtService) / (effectiveVacancy * mgmtFactor)
    : fixedOpex + annualDebtService;
  const breakEvenMonthlyRent = breakEvenAnnualRent / 12;

  const targetCapRate = 0.06;
  const breakEvenPrice = input.noi > 0 ? input.noi / targetCapRate : 0;

  const marginOfSafety = input.monthlyRent - breakEvenMonthlyRent;

  const maxSafeLtv = input.noi > 0 && input.purchasePrice > 0
    ? clamp((input.noi / annualDebtService) * (1 - input.downPaymentPct) * 0.8, 0, 1)
    : 0;

  return {
    breakEvenRent: round2(breakEvenMonthlyRent),
    breakEvenPrice: round2(breakEvenPrice),
    maxSafeLtv: round4(maxSafeLtv),
    marginOfSafety: round2(marginOfSafety),
  };
}

export function computeCapitalEfficiency(input: IVCEEInput, viabilityProbability: number): CapitalEfficiencyResult {
  const roi = input.cashOnCash;

  const stressResults = computeStressTests(input);
  const failCount = stressResults.filter(s => s.survivalStatus === 'FAIL').length;
  const volatilityPenalty = clamp(failCount * 0.15, 0, 0.60);

  const currentLtv = 1 - input.downPaymentPct;
  const leveragePenalty = currentLtv > 0.80 ? 0.25
    : currentLtv > 0.70 ? 0.15
    : currentLtv > 0.60 ? 0.05
    : 0;

  const efficiencyScore = roi * viabilityProbability * (1 - volatilityPenalty) * (1 - leveragePenalty);

  return {
    roiAdjusted: round4(roi),
    volatilityPenalty: round4(volatilityPenalty),
    leveragePenalty: round4(leveragePenalty),
    efficiencyScore: round4(efficiencyScore),
    capitalRank: null,
  };
}

export interface IVCEEFullResult {
  probability: ProbabilityResult;
  sensitivity: SensitivityRow[];
  stressTests: StressTestResult[];
  refinanceRisk: RefinanceRiskResult;
  downside: DownsideResult;
  capitalEfficiency: CapitalEfficiencyResult;
}

export function computeAll(input: IVCEEInput): IVCEEFullResult {
  const probability = computeProbabilityModel(input);
  const sensitivity = computeSensitivityMatrix(input);
  const stressTests = computeStressTests(input);
  const refinanceRisk = computeRefinanceRisk(input);
  const downside = computeDownsideMetrics(input);
  const capitalEfficiency = computeCapitalEfficiency(input, probability.viabilityProbability);

  return { probability, sensitivity, stressTests, refinanceRisk, downside, capitalEfficiency };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
