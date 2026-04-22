import type { SolvencyMetrics, StressScenario, StressResult, AxusdStabilityMetrics } from './types';
import { determinePolicyMode } from './policy';

export const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: 'market-correction',
    label: 'Market Correction',
    description: '20% ETH price decline with moderate treasury impact',
    treasuryDrawdownPct: 10,
    reserveDrawdownPct: 0,
    liabilityIncreasePct: 0,
    ethPriceChangePct: -20,
  },
  {
    id: 'liquidity-crisis',
    label: 'Liquidity Crisis',
    description: '40% ETH crash with significant treasury drawdown and rising liabilities',
    treasuryDrawdownPct: 25,
    reserveDrawdownPct: 0,
    liabilityIncreasePct: 5,
    ethPriceChangePct: -40,
  },
  {
    id: 'black-swan',
    label: 'Black Swan',
    description: '60% ETH collapse with severe treasury depletion and liability surge',
    treasuryDrawdownPct: 50,
    reserveDrawdownPct: 0,
    liabilityIncreasePct: 10,
    ethPriceChangePct: -60,
  },
  {
    id: 'stablecoin-depeg',
    label: 'Stablecoin Depeg',
    description: 'USDC depegging event causing reserve and treasury losses',
    treasuryDrawdownPct: 5,
    reserveDrawdownPct: 3,
    liabilityIncreasePct: 0,
    ethPriceChangePct: 0,
  },
  {
    id: 'governance-attack',
    label: 'Governance Attack',
    description: 'Malicious minting event increasing liabilities with treasury impact',
    treasuryDrawdownPct: 15,
    reserveDrawdownPct: 0,
    liabilityIncreasePct: 20,
    ethPriceChangePct: -10,
  },
];

export function computeMetrics(snapshot: {
  treasuryTotalUsd: number;
  treasuryLiquidUsd: number;
  reservesTotalUsd: number;
  liabilitiesTotalUsd: number;
  lossBufferUsd: number;
  policyMode?: string;
}): {
  coverageRatio: number;
  reserveRatio: number;
  capitalAdequacy: number;
} {
  const { treasuryTotalUsd, reservesTotalUsd, liabilitiesTotalUsd, lossBufferUsd } = snapshot;

  const coverageRatio = liabilitiesTotalUsd > 0
    ? Math.round(((treasuryTotalUsd + reservesTotalUsd) / liabilitiesTotalUsd) * 10000) / 10000
    : 0;

  const reserveRatio = liabilitiesTotalUsd > 0
    ? Math.round((reservesTotalUsd / liabilitiesTotalUsd) * 10000) / 10000
    : 0;

  const capitalAdequacy = liabilitiesTotalUsd > 0
    ? Math.round(((treasuryTotalUsd + reservesTotalUsd + lossBufferUsd) / liabilitiesTotalUsd) * 10000) / 10000
    : 0;

  return { coverageRatio, reserveRatio, capitalAdequacy };
}

export function computeAxusdStability(
  psmReserves: number,
  axusdSupply: number,
  treasuryLiquid: number
): AxusdStabilityMetrics {
  const backingRatio = axusdSupply > 0
    ? Math.round((psmReserves / axusdSupply) * 10000) / 10000
    : 0;

  const pegDeviation = axusdSupply > 0
    ? Math.round((1 - (psmReserves / axusdSupply)) * 10000) / 10000
    : 0;

  const redemptionCapacity = Math.round(Math.min(psmReserves, treasuryLiquid) * 100) / 100;

  let stabilityScore: 'STRONG' | 'ADEQUATE' | 'WEAK' | 'CRITICAL';
  if (backingRatio >= 1.0 && Math.abs(pegDeviation) <= 0.01) {
    stabilityScore = 'STRONG';
  } else if (backingRatio >= 0.95 && Math.abs(pegDeviation) <= 0.03) {
    stabilityScore = 'ADEQUATE';
  } else if (backingRatio >= 0.80) {
    stabilityScore = 'WEAK';
  } else {
    stabilityScore = 'CRITICAL';
  }

  return {
    totalSupply: Math.round(axusdSupply * 100) / 100,
    psmReserves: Math.round(psmReserves * 100) / 100,
    backingRatio,
    pegDeviation,
    redemptionCapacity,
    stabilityScore,
  };
}

export function runStressScenario(
  metrics: SolvencyMetrics,
  scenario: StressScenario
): StressResult {
  const adjustedTreasuryUsd = Math.round(
    metrics.treasuryTotalUsd * (1 - scenario.treasuryDrawdownPct / 100) * 100
  ) / 100;

  const adjustedReservesUsd = Math.round(
    metrics.reservesTotalUsd * (1 - scenario.reserveDrawdownPct / 100) * 100
  ) / 100;

  const adjustedLiabilitiesUsd = Math.round(
    metrics.liabilitiesTotalUsd * (1 + scenario.liabilityIncreasePct / 100) * 100
  ) / 100;

  const adjustedCoverageRatio = adjustedLiabilitiesUsd > 0
    ? Math.round(((adjustedTreasuryUsd + adjustedReservesUsd) / adjustedLiabilitiesUsd) * 10000) / 10000
    : 0;

  const adjustedReserveRatio = adjustedLiabilitiesUsd > 0
    ? Math.round((adjustedReservesUsd / adjustedLiabilitiesUsd) * 10000) / 10000
    : 0;

  const adjustedLossBufferUsd = Math.round(
    Math.max(0, adjustedTreasuryUsd + adjustedReservesUsd - adjustedLiabilitiesUsd) * 100
  ) / 100;

  const resultingPolicyMode = determinePolicyMode(adjustedCoverageRatio, adjustedReserveRatio);

  const breachesThreshold = resultingPolicyMode === 'RESTRICTED' || resultingPolicyMode === 'EMERGENCY';

  return {
    scenario,
    adjustedTreasuryUsd,
    adjustedReservesUsd,
    adjustedLiabilitiesUsd,
    adjustedCoverageRatio,
    adjustedReserveRatio,
    adjustedLossBufferUsd,
    resultingPolicyMode,
    breachesThreshold,
  };
}

export function runAllStressScenarios(metrics: SolvencyMetrics): StressResult[] {
  return STRESS_SCENARIOS.map((scenario) => runStressScenario(metrics, scenario));
}
