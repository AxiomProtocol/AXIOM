import type { AmeInputs, AmeMetricsResult, AmeThresholds, RegimeBand, PolicyMode, TriggerMetric } from './types';
import { DEFAULT_THRESHOLDS, VPI_WEIGHTS, STABILITY_PENALTIES } from './config';

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function safeDivisor(v: number): number {
  return Math.max(1, v);
}

function round8(v: number): number {
  return Math.round(v * 1e8) / 1e8;
}

export function computeCoverageRatio(inputs: AmeInputs): number {
  return round8(inputs.treasuryLiquidUsd / safeDivisor(inputs.netExternalExposureUsd));
}

export function computeReserveRatio(inputs: AmeInputs): number {
  return round8(inputs.designatedReservesUsd / safeDivisor(inputs.circulatingExposureUsd));
}

export function computeLiquidityStabilityRatio(inputs: AmeInputs): number {
  return round8(inputs.redemptionCapacityUsd / safeDivisor(inputs.estimatedRedemptionDemandUsd));
}

export function computeRedemptionStressRatio(inputs: AmeInputs): number {
  return round8(inputs.estimatedRedemptionDemandUsd / safeDivisor(inputs.redemptionCapacityUsd));
}

export function computeVolatilityPressureIndex(signals: AmeInputs['volatilitySignals']): number {
  const peg = isFinite(signals.pegDeviation) ? signals.pegDeviation : 0;
  const depth = isFinite(signals.liquidityDepthDrop) ? signals.liquidityDepthDrop : 0;
  const accel = isFinite(signals.redemptionAcceleration) ? signals.redemptionAcceleration : 0;
  const corr = isFinite(signals.correlationSpike) ? signals.correlationSpike : 0;
  const raw =
    VPI_WEIGHTS.pegDeviation * clamp01(peg) +
    VPI_WEIGHTS.liquidityDepthDrop * clamp01(depth) +
    VPI_WEIGHTS.redemptionAcceleration * clamp01(accel) +
    VPI_WEIGHTS.correlationSpike * clamp01(corr);
  return round8(clamp01(raw));
}

export function computeLossBufferRatio(inputs: AmeInputs): number {
  return round8(inputs.lossBufferUsd / safeDivisor(inputs.netExternalExposureUsd));
}

export function computeCapitalAdequacy(inputs: AmeInputs): number {
  const totalCapital = inputs.treasuryTotalUsd + inputs.designatedReservesUsd + inputs.lossBufferUsd;
  return round8(totalCapital / safeDivisor(inputs.netExternalExposureUsd));
}

export function computeStabilityScore(
  cr: number,
  rr: number,
  lsr: number,
  rsr: number,
  vpi: number
): number {
  if (!isFinite(cr) || !isFinite(rr) || !isFinite(lsr) || !isFinite(rsr) || !isFinite(vpi)) {
    return 0;
  }
  let score = 100;

  const { crBreach, rrBreach, lsrBreach, rsrBreach, vpiBreach } = STABILITY_PENALTIES;

  if (cr < crBreach.threshold) {
    const severity = clamp01(1 - cr / crBreach.threshold);
    score -= crBreach.weight * severity;
  }

  if (rr < rrBreach.threshold) {
    const severity = clamp01(1 - rr / rrBreach.threshold);
    score -= rrBreach.weight * severity;
  }

  if (lsr < lsrBreach.threshold && lsrBreach.threshold > 0) {
    const severity = clamp01(1 - lsr / lsrBreach.threshold);
    score -= lsrBreach.weight * severity;
  }

  if (rsr > rsrBreach.threshold && rsrBreach.threshold < 1) {
    const severity = clamp01((rsr - rsrBreach.threshold) / (1 - rsrBreach.threshold));
    score -= rsrBreach.weight * severity;
  }

  if (vpi > vpiBreach.threshold && vpiBreach.threshold < 1) {
    const severity = clamp01((vpi - vpiBreach.threshold) / (1 - vpiBreach.threshold));
    score -= vpiBreach.weight * severity;
  }

  return clamp(Math.round(score), 0, 100);
}

export function determineRegimeBand(stabilityScore: number): RegimeBand {
  if (stabilityScore >= 75) return 'STABLE';
  if (stabilityScore >= 50) return 'CAUTION';
  if (stabilityScore >= 25) return 'STRESS';
  return 'CRISIS';
}

export function determinePolicyModeV2(
  cr: number,
  rr: number,
  lsr: number,
  rsr: number,
  vpi: number,
  thresholds: AmeThresholds = DEFAULT_THRESHOLDS,
  explicitMode?: string
): { mode: PolicyMode; trigger: TriggerMetric; triggerValue: number } {
  if (explicitMode === 'BOOTSTRAP') {
    return { mode: 'BOOTSTRAP', trigger: 'COVERAGE', triggerValue: cr };
  }

  const breaches: { mode: PolicyMode; trigger: TriggerMetric; triggerValue: number; priority: number }[] = [];

  if (cr < thresholds.crDefensive) {
    breaches.push({ mode: 'EMERGENCY', trigger: 'COVERAGE', triggerValue: cr, priority: 0 });
  } else if (cr < thresholds.crNormal) {
    breaches.push({ mode: 'RESTRICTED', trigger: 'COVERAGE', triggerValue: cr, priority: 1 });
  }

  if (rr < thresholds.rrDefensive) {
    breaches.push({ mode: 'EMERGENCY', trigger: 'RESERVE_RATIO', triggerValue: rr, priority: 0 });
  } else if (rr < thresholds.rrNormal) {
    breaches.push({ mode: 'DEFENSIVE', trigger: 'RESERVE_RATIO', triggerValue: rr, priority: 2 });
  }

  if (vpi > thresholds.vpiShock) {
    breaches.push({ mode: 'EMERGENCY', trigger: 'VOLATILITY_PRESSURE', triggerValue: vpi, priority: 0 });
  } else if (vpi > thresholds.vpiDefensive) {
    breaches.push({ mode: 'DEFENSIVE', trigger: 'VOLATILITY_PRESSURE', triggerValue: vpi, priority: 2 });
  }

  if (rsr > thresholds.rsrRun) {
    breaches.push({ mode: 'RESTRICTED', trigger: 'REDEMPTION_STRESS', triggerValue: rsr, priority: 1 });
  }

  if (lsr < thresholds.lsrFloor) {
    breaches.push({ mode: 'DEFENSIVE', trigger: 'LIQUIDITY_STABILITY', triggerValue: lsr, priority: 2 });
  }

  if (breaches.length === 0) {
    if (cr >= thresholds.crExpansion && rr >= thresholds.rrExpansion) {
      return { mode: 'NORMAL', trigger: 'COVERAGE', triggerValue: cr };
    }
    return { mode: 'CAUTION', trigger: 'COVERAGE', triggerValue: cr };
  }

  breaches.sort((a, b) => a.priority - b.priority);
  return breaches[0];
}

export function evaluateHardBrake(
  cr: number,
  lsr: number,
  rsr: number,
  vpi: number,
  thresholds: AmeThresholds = DEFAULT_THRESHOLDS
): { armed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (cr < thresholds.crDefensive) {
    reasons.push(`Coverage ratio ${cr.toFixed(4)} below defensive threshold ${thresholds.crDefensive}`);
  }
  if (lsr < thresholds.lsrFloor) {
    reasons.push(`Liquidity stability ratio ${lsr.toFixed(4)} below floor ${thresholds.lsrFloor}`);
  }
  if (rsr > thresholds.rsrRun) {
    reasons.push(`Redemption stress ratio ${rsr.toFixed(4)} above run threshold ${thresholds.rsrRun}`);
  }
  if (vpi > thresholds.vpiShock) {
    reasons.push(`Volatility pressure index ${vpi.toFixed(4)} above shock threshold ${thresholds.vpiShock}`);
  }

  return { armed: reasons.length > 0, reasons };
}

export function computeFullMetrics(
  inputs: AmeInputs,
  thresholds: AmeThresholds = DEFAULT_THRESHOLDS,
  explicitMode?: string
): AmeMetricsResult {
  const cr = computeCoverageRatio(inputs);
  const rr = computeReserveRatio(inputs);
  const lsr = computeLiquidityStabilityRatio(inputs);
  const rsr = computeRedemptionStressRatio(inputs);
  const vpi = computeVolatilityPressureIndex(inputs.volatilitySignals);
  const lbr = computeLossBufferRatio(inputs);
  const ca = computeCapitalAdequacy(inputs);
  const sss = computeStabilityScore(cr, rr, lsr, rsr, vpi);
  const regimeBand = determineRegimeBand(sss);
  const { mode, trigger, triggerValue } = determinePolicyModeV2(cr, rr, lsr, rsr, vpi, thresholds, explicitMode);
  const brake = evaluateHardBrake(cr, lsr, rsr, vpi, thresholds);

  return {
    coverageRatio: cr,
    reserveRatio: rr,
    liquidityStabilityRatio: lsr,
    redemptionStressRatio: rsr,
    volatilityPressureIndex: vpi,
    stabilityScore: sss,
    policyMode: mode,
    regimeBand,
    hardBrake: brake.armed,
    hardBrakeReasons: brake.reasons,
    capitalAdequacy: ca,
    lossBufferRatio: lbr,
    triggerMetric: trigger,
    triggerValue,
  };
}
