import type {
  DrawdownTrigger,
  DrawdownResponse,
  RealEstateStressRegime,
  PortfolioExposureControls,
} from './types';

const DEFAULT_EXPOSURE_CONTROLS: PortfolioExposureControls = {
  totalProgramExposureLimit: 0.60,
  perSpvExposureLimit: 0.10,
  directionalConcentrationLimit: 0.25,
  reserveMinimumConstraint: 0.35,
};

export interface ConcentrationCheckResult {
  passed: boolean;
  violations: string[];
  currentExposure: Record<string, number>;
}

export function checkConcentration(
  positions: { assetClass: string; notional: number }[],
  totalCapital: number,
  controls: PortfolioExposureControls = DEFAULT_EXPOSURE_CONTROLS,
): ConcentrationCheckResult {
  const violations: string[] = [];
  const exposureByClass: Record<string, number> = {};

  for (const pos of positions) {
    exposureByClass[pos.assetClass] = (exposureByClass[pos.assetClass] || 0) + pos.notional;
  }

  const totalExposure = Object.values(exposureByClass).reduce((sum, v) => sum + v, 0);
  const totalExposureRatio = totalCapital > 0 ? totalExposure / totalCapital : 0;

  if (totalExposureRatio > controls.totalProgramExposureLimit) {
    violations.push(
      `Total exposure ${(totalExposureRatio * 100).toFixed(1)}% exceeds ${(controls.totalProgramExposureLimit * 100).toFixed(0)}% limit`
    );
  }

  for (const [assetClass, exposure] of Object.entries(exposureByClass)) {
    const ratio = totalCapital > 0 ? exposure / totalCapital : 0;
    if (ratio > controls.directionalConcentrationLimit) {
      violations.push(
        `${assetClass} exposure ${(ratio * 100).toFixed(1)}% exceeds ${(controls.directionalConcentrationLimit * 100).toFixed(0)}% concentration limit`
      );
    }
  }

  for (const pos of positions) {
    const posRatio = totalCapital > 0 ? pos.notional / totalCapital : 0;
    if (posRatio > controls.perSpvExposureLimit) {
      violations.push(
        `Single position ${pos.assetClass} at ${(posRatio * 100).toFixed(1)}% exceeds ${(controls.perSpvExposureLimit * 100).toFixed(0)}% per-position limit`
      );
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    currentExposure: exposureByClass,
  };
}

export function evaluateDrawdown(
  noiBand: { projected: number; actual: number },
  occupancy: { threshold: number; current: number },
  expenses: { budget: number; actual: number; contingency: number },
  reserves: { minimum: number; current: number },
): DrawdownResponse {
  const triggers: DrawdownTrigger[] = [];

  triggers.push({
    type: 'NOI_BELOW_PROJECTION',
    threshold: noiBand.projected * 0.90,
    currentValue: noiBand.actual,
    triggered: noiBand.actual < noiBand.projected * 0.90,
  });

  triggers.push({
    type: 'OCCUPANCY_BELOW_THRESHOLD',
    threshold: occupancy.threshold,
    currentValue: occupancy.current,
    triggered: occupancy.current < occupancy.threshold,
  });

  triggers.push({
    type: 'EXPENSE_OVERRUN',
    threshold: expenses.budget + expenses.contingency,
    currentValue: expenses.actual,
    triggered: expenses.actual > expenses.budget + expenses.contingency,
  });

  triggers.push({
    type: 'RESERVE_COMPRESSION',
    threshold: reserves.minimum,
    currentValue: reserves.current,
    triggered: reserves.current < reserves.minimum,
  });

  const triggeredCount = triggers.filter((t) => t.triggered).length;

  let action: DrawdownResponse['action'] = 'NONE';
  let severity: DrawdownResponse['severity'] = 'LOW';

  if (triggeredCount >= 3) {
    action = 'FREEZE_GROWTH';
    severity = 'CRITICAL';
  } else if (triggeredCount === 2) {
    action = 'PRIORITIZE_RESERVES';
    severity = 'HIGH';
  } else if (triggeredCount === 1) {
    const trigger = triggers.find((t) => t.triggered);
    if (trigger?.type === 'RESERVE_COMPRESSION') {
      action = 'TIGHTEN_APPROVALS';
      severity = 'HIGH';
    } else {
      action = 'REDUCE_DEPLOYMENT';
      severity = 'MEDIUM';
    }
  }

  return { triggers, action, severity };
}

export function detectStressRegime(
  interestRateChange: number,
  vacancyRate: number,
  expenseOverrunPct: number,
  liquidityScore: number,
): RealEstateStressRegime | null {
  if (interestRateChange > 2.0) return 'RATE_SHOCK';
  if (vacancyRate > 0.30) return 'VACANCY_SHOCK';
  if (expenseOverrunPct > 0.25) return 'EXPENSE_SHOCK';
  if (liquidityScore < 0.20) return 'LIQUIDITY_SHOCK';
  return null;
}

export function getExposureControls(): PortfolioExposureControls {
  return { ...DEFAULT_EXPOSURE_CONTROLS };
}
