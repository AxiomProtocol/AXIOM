export type PolicyMode = 'BOOTSTRAP' | 'NORMAL' | 'CAUTION' | 'DEFENSIVE' | 'RESTRICTED' | 'EMERGENCY';

export type TriggerMetric =
  | 'COVERAGE'
  | 'RESERVE_RATIO'
  | 'LIQUIDITY_STABILITY'
  | 'LOSS_BUFFER'
  | 'REDEMPTION_STRESS'
  | 'VOLATILITY_PRESSURE';

export type EnforcementEventType =
  | 'MODE_CHANGE'
  | 'HARD_BRAKE_ARMED'
  | 'HARD_BRAKE_RELEASED'
  | 'FLOW_REDIRECT'
  | 'YIELD_SUPPRESSED'
  | 'REDEMPTION_THROTTLED'
  | 'STRESS_TEST_RUN';

export type Severity = 'INFO' | 'WARN' | 'CRITICAL';

export type RegimeBand = 'STABLE' | 'CAUTION' | 'STRESS' | 'CRISIS';

export type WaterfallBucket = 'LOSS_BUFFER' | 'RESERVES' | 'STABILIZATION' | 'YIELD' | 'GROWTH';

export interface AmeInputs {
  treasuryLiquidUsd: number;
  treasuryTotalUsd: number;
  designatedReservesUsd: number;
  lossBufferUsd: number;
  netExternalExposureUsd: number;
  circulatingExposureUsd: number;
  redemptionCapacityUsd: number;
  estimatedRedemptionDemandUsd: number;
  volatilitySignals: VolatilitySignals;
  liquiditySignals: LiquiditySignals;
}

export interface VolatilitySignals {
  pegDeviation: number;
  liquidityDepthDrop: number;
  redemptionAcceleration: number;
  correlationSpike: number;
}

export interface LiquiditySignals {
  depthUsd: number;
  bidAskSpreadBps: number;
  volumeChange24h: number;
}

export interface AmeMetricsResult {
  coverageRatio: number;
  reserveRatio: number;
  liquidityStabilityRatio: number;
  redemptionStressRatio: number;
  volatilityPressureIndex: number;
  stabilityScore: number;
  policyMode: PolicyMode;
  regimeBand: RegimeBand;
  hardBrake: boolean;
  hardBrakeReasons: string[];
  capitalAdequacy: number;
  lossBufferRatio: number;
  triggerMetric: TriggerMetric;
  triggerValue: number;
}

export interface AmeThresholds {
  crExpansion: number;
  crNormal: number;
  crDefensive: number;
  rrExpansion: number;
  rrNormal: number;
  rrDefensive: number;
  vpiDefensive: number;
  vpiShock: number;
  rsrRun: number;
  lsrFloor: number;
}

export interface WaterfallAllocation {
  bucket: WaterfallBucket;
  pct: number;
}

export interface YieldPermission {
  yieldAllowed: boolean;
  stabilityModifierFactor: number;
  maxYieldPct: number;
  reason: string;
}

export interface StressShock {
  treasuryDrawdownPct: number;
  reserveDrawdownPct: number;
  liabilityIncreasePct: number;
  redemptionDemandMultiplier: number;
  vpiOverride: number | null;
}

export interface StressScenario {
  key: string;
  label: string;
  description: string;
  shock: StressShock;
}

export interface StressProjection {
  scenario: StressScenario;
  baseMetrics: AmeMetricsResult;
  projectedMetrics: AmeMetricsResult;
  breaches: string[];
  policyModeAfter: PolicyMode;
  hardBrakeAfter: boolean;
}
