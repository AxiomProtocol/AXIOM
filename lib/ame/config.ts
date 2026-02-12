import type { AMEConfig, AMEStressScenario } from './types';

export const DEFAULT_AME_CONFIG: AMEConfig = {
  rvRef: 0.80,
  ddRef: 0.35,
  weights: { wv: 0.30, wd: 0.25, wf: 0.25, wl: 0.20 },
  baseTargets: { cr: 1.50, rr: 0.10, lbr: 0.03, ld: 0.15 },
  basePayout: 1.0,
  pmMin: 1.0,
  pmMax: 10.0,
  rsEpsilon: 0.05,
};

export const MODEL_VERSION = 'AME-v1.0.0';

export const STRESS_SCENARIOS: AMEStressScenario[] = [
  {
    scenarioKey: 'MARKET_CORRECTION',
    label: 'Market Correction',
    description: 'Moderate ETH decline with volatility spike',
    shocks: { treasuryDrawdownPct: 15, rvOverride: 0.60, ddOverride: 0.20 },
  },
  {
    scenarioKey: 'LIQUIDITY_CRISIS',
    label: 'Liquidity Crisis',
    description: 'Severe redemption pressure with reserve drawdown',
    shocks: { rcDrawdownPct: 50, fiOverride: 0.80, reserveDrawdownPct: 20 },
  },
  {
    scenarioKey: 'BLACK_SWAN',
    label: 'Black Swan',
    description: 'Extreme multi-factor stress with systemic collapse',
    shocks: { treasuryDrawdownPct: 50, rcDrawdownPct: 70, rvOverride: 0.95, ddOverride: 0.60, fiOverride: 0.90 },
  },
  {
    scenarioKey: 'DEPEG',
    label: 'Stablecoin Depeg',
    description: 'AXUSD redemption surge with reserve pressure',
    shocks: { liabilityIncreasePct: 15, fiOverride: 0.70, reserveDrawdownPct: 10 },
  },
  {
    scenarioKey: 'GOVERNANCE_ATTACK',
    label: 'Governance Attack',
    description: 'Malicious action causing liquidity drain and liability spike',
    shocks: { treasuryDrawdownPct: 25, liabilityIncreasePct: 30, rcDrawdownPct: 40 },
  },
];
