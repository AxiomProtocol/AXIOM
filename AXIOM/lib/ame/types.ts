export type RegimeBand = 'STABLE' | 'CAUTION' | 'STRESS' | 'CRISIS';
export type LiabilityMode = 'GROSS' | 'NET';
export type EvaluationStatus = 'OK' | 'BREACH' | 'CRISIS';

export type PolicyActionType =
  | 'ACTION_CRISIS_LOCKDOWN'
  | 'ACTION_FREEZE_DISTRIBUTIONS'
  | 'ACTION_LIQUIDITY_DEFENSE_MODE'
  | 'ACTION_REDIRECT_FLOWS_TO_RESERVES';

export interface AMEInput {
  treasuryCapitalUsd: number;
  liquidReservesUsd: number;
  outstandingLiabilitiesUsd: number;
  redemptionCapacityUsd: number;
  realizedVolatility: number;
  drawdownPct: number;
  flowImbalance: number;
  liquidityCompression: number;
  updateSourceVersion: string;
  mode: LiabilityMode;
}

export interface AMERatios {
  coverageRatio: number;
  reserveRatio: number;
  lossBufferRatio: number;
  liquidityDepth: number;
}

export interface NormalizedStress {
  volShock: number;
  drawdownPressure: number;
  flowStress: number;
  liquidityStress: number;
}

export interface AdaptiveTargets {
  crTarget: number;
  rrTarget: number;
  lbrTarget: number;
  ldTarget: number;
}

export interface PolicyAction {
  action: PolicyActionType;
  reason: string;
  threshold: number;
  currentValue: number;
  breached: boolean;
}

export interface AMEEvaluation {
  evaluationId: string;
  modelVersion: string;
  inputSnapshotRef: string;
  regimeBand: RegimeBand;
  rs: number;
  pm: number;
  ratios: AMERatios;
  targets: AdaptiveTargets;
  payoutFactor: number;
  actions: PolicyAction[];
  status: EvaluationStatus;
  disclosureSummary: string;
  timestamp: string;
}

export interface AMEConfig {
  rvRef: number;
  ddRef: number;
  weights: { wv: number; wd: number; wf: number; wl: number };
  baseTargets: { cr: number; rr: number; lbr: number; ld: number };
  basePayout: number;
  pmMin: number;
  pmMax: number;
  rsEpsilon: number;
}

export interface AMEStressScenario {
  scenarioKey: string;
  label: string;
  description: string;
  shocks: {
    treasuryDrawdownPct?: number;
    reserveDrawdownPct?: number;
    liabilityIncreasePct?: number;
    rvOverride?: number;
    ddOverride?: number;
    rcDrawdownPct?: number;
    fiOverride?: number;
  };
}

export interface AMEStressResult {
  scenario: AMEStressScenario;
  baselineEvaluation: AMEEvaluation;
  projectedRatios: AMERatios;
  projectedTargets: AdaptiveTargets;
  projectedRS: number;
  projectedPM: number;
  projectedRegimeBand: RegimeBand;
  projectedActions: PolicyAction[];
  projectedStatus: EvaluationStatus;
  breaches: { metric: string; target: number; projected: number; breached: boolean }[];
}

export interface AMEHistoryPoint {
  ts: string;
  metricKey: string;
  value: number;
  evaluationId: string;
}
