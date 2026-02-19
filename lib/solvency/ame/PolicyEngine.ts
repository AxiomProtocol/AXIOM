import type { AmeInputs, AmeMetricsResult, AmeThresholds, PolicyMode, TriggerMetric } from './types';
import { DEFAULT_THRESHOLDS, HARD_BRAKE_RELEASE_CONSECUTIVE } from './config';
import {
  computeCoverageRatio,
  computeReserveRatio,
  computeLiquidityStabilityRatio,
  computeRedemptionStressRatio,
  computeVolatilityPressureIndex,
  computeStabilityScore,
  determinePolicyModeV2,
  evaluateHardBrake,
} from './MetricsMath';

export interface PolicyDecision {
  mode: PolicyMode;
  trigger: TriggerMetric;
  triggerValue: number;
  stabilityScore: number;
  hardBrake: { armed: boolean; reasons: string[] };
  breaches: Array<{ metric: TriggerMetric; value: number; threshold: number; direction: 'ABOVE' | 'BELOW' }>;
}

export function evaluatePolicy(
  inputs: AmeInputs,
  thresholds: AmeThresholds = DEFAULT_THRESHOLDS,
  explicitMode?: string
): PolicyDecision {
  const cr = computeCoverageRatio(inputs);
  const rr = computeReserveRatio(inputs);
  const lsr = computeLiquidityStabilityRatio(inputs);
  const rsr = computeRedemptionStressRatio(inputs);
  const vpi = computeVolatilityPressureIndex(inputs.volatilitySignals);
  const sss = computeStabilityScore(cr, rr, lsr, rsr, vpi);

  const { mode, trigger, triggerValue } = determinePolicyModeV2(cr, rr, lsr, rsr, vpi, thresholds, explicitMode);
  const hardBrake = evaluateHardBrake(cr, lsr, rsr, vpi, thresholds);

  const breaches: PolicyDecision['breaches'] = [];

  if (cr < thresholds.crDefensive) {
    breaches.push({ metric: 'COVERAGE', value: cr, threshold: thresholds.crDefensive, direction: 'BELOW' });
  }
  if (rr < thresholds.rrDefensive) {
    breaches.push({ metric: 'RESERVE_RATIO', value: rr, threshold: thresholds.rrDefensive, direction: 'BELOW' });
  }
  if (lsr < thresholds.lsrFloor) {
    breaches.push({ metric: 'LIQUIDITY_STABILITY', value: lsr, threshold: thresholds.lsrFloor, direction: 'BELOW' });
  }
  if (rsr > thresholds.rsrRun) {
    breaches.push({ metric: 'REDEMPTION_STRESS', value: rsr, threshold: thresholds.rsrRun, direction: 'ABOVE' });
  }
  if (vpi > thresholds.vpiShock) {
    breaches.push({ metric: 'VOLATILITY_PRESSURE', value: vpi, threshold: thresholds.vpiShock, direction: 'ABOVE' });
  }

  return { mode, trigger, triggerValue, stabilityScore: sss, hardBrake, breaches };
}

export function canReleaseHardBrake(
  consecutiveSafeCount: number,
  requiredConsecutive: number = HARD_BRAKE_RELEASE_CONSECUTIVE
): boolean {
  return consecutiveSafeCount >= requiredConsecutive;
}

export function determineSeverity(mode: PolicyMode): 'INFO' | 'WARN' | 'CRITICAL' {
  if (mode === 'EMERGENCY' || mode === 'RESTRICTED') return 'CRITICAL';
  if (mode === 'DEFENSIVE') return 'WARN';
  return 'INFO';
}
