import type { AmeInputs, AmeMetricsResult, AmeThresholds, StressScenario, StressProjection, StressShock } from './types';
import { computeFullMetrics } from './MetricsMath';
import { DEFAULT_THRESHOLDS } from './config';

export const STRESS_SCENARIOS: StressScenario[] = [
  {
    key: 'MARKET_CORRECTION',
    label: 'Market Correction',
    description: '15% treasury drawdown with elevated volatility.',
    shock: {
      treasuryDrawdownPct: 15,
      reserveDrawdownPct: 5,
      liabilityIncreasePct: 0,
      redemptionDemandMultiplier: 1.3,
      vpiOverride: null,
    },
  },
  {
    key: 'LIQUIDITY_CRISIS',
    label: 'Liquidity Crisis',
    description: '50% redemption capacity drawdown with severe flow imbalance.',
    shock: {
      treasuryDrawdownPct: 20,
      reserveDrawdownPct: 10,
      liabilityIncreasePct: 5,
      redemptionDemandMultiplier: 2.5,
      vpiOverride: null,
    },
  },
  {
    key: 'BLACK_SWAN',
    label: 'Black Swan',
    description: '50% treasury collapse with 70% redemption capacity loss.',
    shock: {
      treasuryDrawdownPct: 50,
      reserveDrawdownPct: 30,
      liabilityIncreasePct: 10,
      redemptionDemandMultiplier: 3.0,
      vpiOverride: 0.90,
    },
  },
  {
    key: 'STABLECOIN_DEPEG',
    label: 'Stablecoin Depeg',
    description: 'Reserve asset depegging with 15% liability increase.',
    shock: {
      treasuryDrawdownPct: 10,
      reserveDrawdownPct: 15,
      liabilityIncreasePct: 15,
      redemptionDemandMultiplier: 2.0,
      vpiOverride: 0.70,
    },
  },
  {
    key: 'GOVERNANCE_ATTACK',
    label: 'Governance Attack',
    description: 'Malicious minting with 25% treasury drawdown and 30% liability surge.',
    shock: {
      treasuryDrawdownPct: 25,
      reserveDrawdownPct: 0,
      liabilityIncreasePct: 30,
      redemptionDemandMultiplier: 1.8,
      vpiOverride: null,
    },
  },
  {
    key: 'BANK_RUN',
    label: 'Redemption Run',
    description: 'Coordinated redemption demand exceeding capacity with liquidity drain.',
    shock: {
      treasuryDrawdownPct: 10,
      reserveDrawdownPct: 20,
      liabilityIncreasePct: 0,
      redemptionDemandMultiplier: 4.0,
      vpiOverride: 0.60,
    },
  },
];

export function applyShock(inputs: AmeInputs, shock: StressShock): AmeInputs {
  const shockedLiquid = inputs.treasuryLiquidUsd * (1 - shock.treasuryDrawdownPct / 100);
  const shockedTotal = inputs.treasuryTotalUsd * (1 - shock.treasuryDrawdownPct / 100);
  const shockedReserves = inputs.designatedReservesUsd * (1 - shock.reserveDrawdownPct / 100);
  const shockedLossBuffer = inputs.lossBufferUsd * (1 - shock.treasuryDrawdownPct / 100);
  const shockedExposure = inputs.netExternalExposureUsd * (1 + shock.liabilityIncreasePct / 100);
  const shockedCirculating = inputs.circulatingExposureUsd * (1 + shock.liabilityIncreasePct / 100);
  const shockedRedemptionDemand = inputs.estimatedRedemptionDemandUsd * shock.redemptionDemandMultiplier;
  const shockedRedemptionCapacity = inputs.redemptionCapacityUsd * (1 - shock.reserveDrawdownPct / 100);

  const volatilitySignals = shock.vpiOverride !== null
    ? {
        pegDeviation: shock.vpiOverride,
        liquidityDepthDrop: shock.vpiOverride * 0.8,
        redemptionAcceleration: shock.vpiOverride * 0.6,
        correlationSpike: shock.vpiOverride * 0.5,
      }
    : {
        pegDeviation: Math.min(1, inputs.volatilitySignals.pegDeviation * 1.5),
        liquidityDepthDrop: Math.min(1, inputs.volatilitySignals.liquidityDepthDrop * 1.5),
        redemptionAcceleration: Math.min(1, inputs.volatilitySignals.redemptionAcceleration * 1.5),
        correlationSpike: Math.min(1, inputs.volatilitySignals.correlationSpike * 1.3),
      };

  return {
    treasuryLiquidUsd: Math.max(0, shockedLiquid),
    treasuryTotalUsd: Math.max(0, shockedTotal),
    designatedReservesUsd: Math.max(0, shockedReserves),
    lossBufferUsd: Math.max(0, shockedLossBuffer),
    netExternalExposureUsd: Math.max(0, shockedExposure),
    circulatingExposureUsd: Math.max(0, shockedCirculating),
    redemptionCapacityUsd: Math.max(0, shockedRedemptionCapacity),
    estimatedRedemptionDemandUsd: Math.max(0, shockedRedemptionDemand),
    volatilitySignals,
    liquiditySignals: inputs.liquiditySignals,
  };
}

export function runStressProjection(
  inputs: AmeInputs,
  scenario: StressScenario,
  thresholds: AmeThresholds = DEFAULT_THRESHOLDS
): StressProjection {
  const baseMetrics = computeFullMetrics(inputs, thresholds);
  const shockedInputs = applyShock(inputs, scenario.shock);
  const projectedMetrics = computeFullMetrics(shockedInputs, thresholds);

  const breaches: string[] = [];
  if (projectedMetrics.coverageRatio < thresholds.crDefensive) {
    breaches.push(`Coverage ratio ${projectedMetrics.coverageRatio.toFixed(4)} breaches defensive threshold ${thresholds.crDefensive}`);
  }
  if (projectedMetrics.reserveRatio < thresholds.rrDefensive) {
    breaches.push(`Reserve ratio ${projectedMetrics.reserveRatio.toFixed(4)} breaches defensive threshold ${thresholds.rrDefensive}`);
  }
  if (projectedMetrics.liquidityStabilityRatio < thresholds.lsrFloor) {
    breaches.push(`Liquidity stability ratio ${projectedMetrics.liquidityStabilityRatio.toFixed(4)} breaches floor ${thresholds.lsrFloor}`);
  }
  if (projectedMetrics.redemptionStressRatio > thresholds.rsrRun) {
    breaches.push(`Redemption stress ratio ${projectedMetrics.redemptionStressRatio.toFixed(4)} exceeds run threshold ${thresholds.rsrRun}`);
  }
  if (projectedMetrics.volatilityPressureIndex > thresholds.vpiShock) {
    breaches.push(`Volatility pressure index ${projectedMetrics.volatilityPressureIndex.toFixed(4)} exceeds shock threshold ${thresholds.vpiShock}`);
  }

  return {
    scenario,
    baseMetrics,
    projectedMetrics,
    breaches,
    policyModeAfter: projectedMetrics.policyMode,
    hardBrakeAfter: projectedMetrics.hardBrake,
  };
}

export function runAllStressProjections(
  inputs: AmeInputs,
  thresholds: AmeThresholds = DEFAULT_THRESHOLDS
): StressProjection[] {
  return STRESS_SCENARIOS.map((scenario) => runStressProjection(inputs, scenario, thresholds));
}
