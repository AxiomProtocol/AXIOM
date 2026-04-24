import type { ReDealAssumption, ReDealMetric } from '../../../shared/realEstateSchema';

export type DealStrategy = 'brrrr' | 'flip' | 'hold' | 'note' | 'multifamily';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface UnderwritingInput {
  strategy: DealStrategy;
  assumptions: {
    purchasePrice: number;
    afterRepairValue: number;
    rehabCost: number;
    closingCostBuy: number;
    closingCostSell: number;
    holdingCostMonthly: number;
    holdingPeriodMonths: number;
    loanAmount: number;
    interestRate: number;
    loanTermYears: number;
    monthlyRent: number;
    vacancyRate: number;
    propertyTaxAnnual: number;
    insuranceAnnual: number;
    maintenanceAnnual: number;
    managementRate: number;
    refinanceLtv?: number;
    refinanceRate?: number;
    refinanceTermYears?: number;
    unitCount?: number;
    noteRate?: number;
    noteBalance?: number;
    noteTermMonths?: number;
  };
}

export interface RiskFlag {
  flagType: string;
  severity: RiskSeverity;
  message: string;
  detail?: Record<string, unknown>;
}

export interface UnderwritingResult {
  cashNeeded: number;
  monthlyDebtService: number;
  dscr: number;
  noiAnnual: number;
  capRate: number;
  cashOnCash: number;
  breakEvenRent: number;
  arvSpread: number;
  grossYield: number;
  netYield: number;
  totalProjectCost: number;
  monthlyNoi: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  riskFlags: RiskFlag[];
  strategySpecific: Record<string, number>;
}

function computeMonthlyPayment(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0 || annualRate <= 0 || termYears <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = termYears * 12;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
}

function assessRisks(input: UnderwritingInput, result: Partial<UnderwritingResult>): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const a = input.assumptions;

  if ((result.dscr ?? 0) < 1.0) {
    flags.push({
      flagType: 'low_dscr',
      severity: 'critical',
      message: `DSCR of ${(result.dscr ?? 0).toFixed(2)} is below 1.0, indicating negative cash flow`,
      detail: { dscr: result.dscr },
    });
  } else if ((result.dscr ?? 0) < 1.25) {
    flags.push({
      flagType: 'marginal_dscr',
      severity: 'high',
      message: `DSCR of ${(result.dscr ?? 0).toFixed(2)} is below the 1.25 lender threshold`,
      detail: { dscr: result.dscr },
    });
  }

  if ((result.capRate ?? 0) < 4) {
    flags.push({
      flagType: 'low_cap_rate',
      severity: 'high',
      message: `Cap rate of ${(result.capRate ?? 0).toFixed(2)}% is below 4%, indicating overpriced asset`,
      detail: { capRate: result.capRate },
    });
  }

  if ((result.cashOnCash ?? 0) < 0) {
    flags.push({
      flagType: 'negative_cash_on_cash',
      severity: 'critical',
      message: 'Negative cash-on-cash return, deal loses money annually',
      detail: { cashOnCash: result.cashOnCash },
    });
  }

  if (a.vacancyRate > 15) {
    flags.push({
      flagType: 'high_vacancy',
      severity: 'medium',
      message: `Vacancy assumption of ${a.vacancyRate}% is above market average`,
      detail: { vacancyRate: a.vacancyRate },
    });
  }

  const ltv = a.loanAmount / a.purchasePrice * 100;
  if (ltv > 80) {
    flags.push({
      flagType: 'high_leverage',
      severity: a.loanAmount / a.purchasePrice > 0.9 ? 'critical' : 'high',
      message: `LTV of ${ltv.toFixed(1)}% exceeds 80% threshold`,
      detail: { ltv },
    });
  }

  const rehabToArv = a.rehabCost / a.afterRepairValue * 100;
  if (rehabToArv > 40) {
    flags.push({
      flagType: 'high_rehab_ratio',
      severity: 'high',
      message: `Rehab cost is ${rehabToArv.toFixed(1)}% of ARV, indicating significant renovation risk`,
      detail: { rehabToArv },
    });
  }

  if ((result.arvSpread ?? 0) < 20 && (input.strategy === 'brrrr' || input.strategy === 'flip')) {
    flags.push({
      flagType: 'thin_arv_spread',
      severity: 'medium',
      message: `ARV spread of ${(result.arvSpread ?? 0).toFixed(1)}% is below 20%, leaving thin margin`,
      detail: { arvSpread: result.arvSpread },
    });
  }

  if (a.holdingPeriodMonths > 12 && input.strategy === 'flip') {
    flags.push({
      flagType: 'long_flip_hold',
      severity: 'medium',
      message: `${a.holdingPeriodMonths} month hold period is long for a flip strategy`,
      detail: { holdingPeriodMonths: a.holdingPeriodMonths },
    });
  }

  if (flags.length === 0) {
    flags.push({
      flagType: 'pass',
      severity: 'low',
      message: 'No significant risk flags detected',
    });
  }

  return flags;
}

export function computeUnderwriting(input: UnderwritingInput): UnderwritingResult {
  const a = input.assumptions;
  const strategySpecific: Record<string, number> = {};

  const totalProjectCost = a.purchasePrice + a.rehabCost + a.closingCostBuy +
    (a.holdingCostMonthly * a.holdingPeriodMonths);
  const cashNeeded = totalProjectCost - a.loanAmount;

  const monthlyDebtService = computeMonthlyPayment(a.loanAmount, a.interestRate, a.loanTermYears);

  const grossRentalIncome = a.monthlyRent * 12 * (a.unitCount || 1);
  const effectiveGrossIncome = grossRentalIncome * (1 - a.vacancyRate / 100);

  const operatingExpenses = a.propertyTaxAnnual + a.insuranceAnnual +
    a.maintenanceAnnual + (effectiveGrossIncome * a.managementRate / 100);

  const noiAnnual = effectiveGrossIncome - operatingExpenses;
  const monthlyNoi = noiAnnual / 12;

  const annualDebtService = monthlyDebtService * 12;
  const dscr = annualDebtService > 0 ? noiAnnual / annualDebtService : 0;

  const capRate = a.purchasePrice > 0 ? (noiAnnual / a.purchasePrice) * 100 : 0;

  const annualCashFlow = noiAnnual - annualDebtService;
  const cashOnCash = cashNeeded > 0 ? (annualCashFlow / cashNeeded) * 100 : 0;

  const monthlyFixedCosts = monthlyDebtService +
    (a.propertyTaxAnnual / 12) + (a.insuranceAnnual / 12) +
    (a.maintenanceAnnual / 12);
  const breakEvenDenom = 1 - a.vacancyRate / 100 - a.managementRate / 100;
  const breakEvenRent = breakEvenDenom > 0 ? monthlyFixedCosts / breakEvenDenom : 0;

  const arvSpread = a.afterRepairValue > 0
    ? ((a.afterRepairValue - totalProjectCost) / a.afterRepairValue) * 100
    : 0;

  const grossYield = a.purchasePrice > 0 ? (grossRentalIncome / a.purchasePrice) * 100 : 0;
  const netYield = a.purchasePrice > 0 ? (noiAnnual / a.purchasePrice) * 100 : 0;

  switch (input.strategy) {
    case 'brrrr': {
      const refiLtv = a.refinanceLtv ?? 75;
      const refiAmount = a.afterRepairValue * (refiLtv / 100);
      const refiPayment = computeMonthlyPayment(
        refiAmount, a.refinanceRate ?? a.interestRate, a.refinanceTermYears ?? 30
      );
      const cashRecovered = refiAmount - a.loanAmount;
      const cashLeftInDeal = cashNeeded - cashRecovered;
      strategySpecific.refiAmount = Math.round(refiAmount);
      strategySpecific.refiPayment = Math.round(refiPayment * 100) / 100;
      strategySpecific.cashRecovered = Math.round(cashRecovered);
      strategySpecific.cashLeftInDeal = Math.round(cashLeftInDeal);
      strategySpecific.infiniteReturn = cashLeftInDeal <= 0 ? 1 : 0;
      break;
    }
    case 'flip': {
      const grossProfit = a.afterRepairValue - totalProjectCost - a.closingCostSell;
      const roi = cashNeeded > 0 ? (grossProfit / cashNeeded) * 100 : 0;
      const annualizedRoi = a.holdingPeriodMonths > 0
        ? roi * (12 / a.holdingPeriodMonths)
        : 0;
      strategySpecific.grossProfit = Math.round(grossProfit);
      strategySpecific.flipRoi = Math.round(roi * 100) / 100;
      strategySpecific.annualizedRoi = Math.round(annualizedRoi * 100) / 100;
      break;
    }
    case 'hold': {
      const fiveYearAppreciation = a.afterRepairValue * Math.pow(1.03, 5);
      const equityIn5Years = fiveYearAppreciation - a.loanAmount;
      strategySpecific.fiveYearValue = Math.round(fiveYearAppreciation);
      strategySpecific.fiveYearEquity = Math.round(equityIn5Years);
      strategySpecific.totalAnnualReturn = Math.round((cashOnCash + 3) * 100) / 100;
      break;
    }
    case 'note': {
      const noteBalance = a.noteBalance ?? a.loanAmount;
      const noteMonthlyPayment = computeMonthlyPayment(
        noteBalance, a.noteRate ?? a.interestRate, (a.noteTermMonths ?? 360) / 12
      );
      const noteYield = a.purchasePrice > 0
        ? (noteMonthlyPayment * 12 / a.purchasePrice) * 100
        : 0;
      strategySpecific.notePayment = Math.round(noteMonthlyPayment * 100) / 100;
      strategySpecific.noteYield = Math.round(noteYield * 100) / 100;
      strategySpecific.noteBalance = Math.round(noteBalance);
      break;
    }
    case 'multifamily': {
      const pricePerUnit = a.purchasePrice / (a.unitCount || 1);
      const noiPerUnit = noiAnnual / (a.unitCount || 1);
      const expenseRatio = effectiveGrossIncome > 0
        ? (operatingExpenses / effectiveGrossIncome) * 100
        : 0;
      strategySpecific.pricePerUnit = Math.round(pricePerUnit);
      strategySpecific.noiPerUnit = Math.round(noiPerUnit);
      strategySpecific.expenseRatio = Math.round(expenseRatio * 100) / 100;
      strategySpecific.grm = grossRentalIncome > 0
        ? Math.round((a.purchasePrice / grossRentalIncome) * 100) / 100
        : 0;
      break;
    }
  }

  const partialResult: Partial<UnderwritingResult> = {
    dscr, capRate, cashOnCash, arvSpread,
  };
  const riskFlags = assessRisks(input, partialResult);

  return {
    cashNeeded: Math.round(cashNeeded),
    monthlyDebtService: Math.round(monthlyDebtService * 100) / 100,
    dscr: Math.round(dscr * 100) / 100,
    noiAnnual: Math.round(noiAnnual),
    capRate: Math.round(capRate * 100) / 100,
    cashOnCash: Math.round(cashOnCash * 100) / 100,
    breakEvenRent: Math.round(breakEvenRent * 100) / 100,
    arvSpread: Math.round(arvSpread * 100) / 100,
    grossYield: Math.round(grossYield * 100) / 100,
    netYield: Math.round(netYield * 100) / 100,
    totalProjectCost: Math.round(totalProjectCost),
    monthlyNoi: Math.round(monthlyNoi * 100) / 100,
    effectiveGrossIncome: Math.round(effectiveGrossIncome),
    operatingExpenses: Math.round(operatingExpenses),
    riskFlags,
    strategySpecific,
  };
}
