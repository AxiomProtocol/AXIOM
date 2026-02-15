export type ExecutionGrade = 'A' | 'B' | 'C' | 'REJECT';
export type EligibilityStatus = 'ELIGIBLE' | 'WAIT' | 'REJECTED';
export type LiquidityTier = 'HIGH' | 'MODERATE' | 'LOW' | 'FRAGILE';
export type RegimeTier = 'LOW' | 'NORMAL' | 'EXPANDING' | 'EXTREME';
export type EntryTriggerType = 'ZONE_EDGE' | 'BREAKOUT' | 'MEAN_DRIFT' | 'VOL_EXPANSION' | 'NONE';
export type PolicyMode = 'BOOTSTRAP' | 'NORMAL' | 'CAUTION' | 'RESTRICTED' | 'EMERGENCY';
export type Direction = 'LONG' | 'SHORT' | 'NEUTRAL';
export type EventType =
  | 'DECISION_CREATED'
  | 'DECISION_REJECTED'
  | 'DECISION_WAIT'
  | 'AUTHORIZED'
  | 'OPENED'
  | 'CLOSED'
  | 'INVALIDATED'
  | 'EXPIRED'
  | 'EMERGENCY_EXIT';

export interface SetupInput {
  id: string;
  symbol: string;
  assetType: 'CRYPTO' | 'EQUITY';
  entryZoneLow: number;
  entryZoneHigh: number;
  invalidationPrice: number;
  signalZ: number;
  volatilityEstimate: number;
  confidenceScore: number;
  expectedP5: number;
  expectedP50: number;
  expectedP95: number;
  horizonDays: number;
  expiresAt: Date | null;
  status: string;
  liquidityNotes: string;
}

export interface PortfolioState {
  portfolioCapitalUsd: number;
  riskFractionBps: number;
  maxConcurrentTrades: number;
  maxPerAssetExposureBps: number;
  drawdownBrakeBps: number;
  systemVolatilityTier: string;
  policyMode: PolicyMode;
  globalSizeMultiplier: number;
}

export interface ExecutionDecision {
  id: string;
  runId: string;
  setupId: string;
  snapshotId: string | null;
  symbol: string;
  assetType: string;
  direction: Direction;
  currentPrice: number;
  signalZ: number;
  volatilityEstimate: number;
  confidenceScore: number;
  liquidityTier: LiquidityTier;
  regimeTier: RegimeTier;
  grade: ExecutionGrade;
  gradeSignalScore: number;
  gradeAsymmetryScore: number;
  gradeRegimeScore: number;
  gradeLiquidityScore: number;
  gradeTotal: number;
  eligibilityStatus: EligibilityStatus;
  eligibilityReasonCodes: string[];
  riskFractionBps: number;
  riskBudgetUsd: number;
  invalidationDistance: number;
  positionSizeQty: number;
  positionNotionalUsd: number;
  stopPrice: number;
  takeProfitP50: number;
  takeProfitP95: number;
  entryTrigger: EntryTriggerType;
  entryAllowed: boolean;
  policyMode: PolicyMode;
  decisionChecksum: string;
  decisionTrace: DecisionTrace;
  modelVersion: string;
  createdAt: Date;
}

export interface GradeComponents {
  signalScore: number;
  asymmetryScore: number;
  regimeScore: number;
  liquidityScore: number;
  total: number;
}

export interface DecisionTrace {
  setupId: string;
  symbol: string;
  assetType: string;
  currentPrice: number;
  signalZ: number;
  volatilityEstimate: number;
  confidenceScore: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  invalidationPrice: number;
  expectedP5: number;
  expectedP50: number;
  expectedP95: number;
  direction: Direction;
  liquidityTier: LiquidityTier;
  regimeTier: RegimeTier;
  gradeComponents: GradeComponents;
  grade: ExecutionGrade;
  eligibilityStatus: EligibilityStatus;
  eligibilityReasonCodes: string[];
  riskFractionBps: number;
  riskBudgetUsd: number;
  invalidationDistance: number;
  positionSizeQty: number;
  positionNotionalUsd: number;
  stopPrice: number;
  takeProfitP50: number;
  takeProfitP95: number;
  entryTrigger: EntryTriggerType;
  entryAllowed: boolean;
  policyMode: PolicyMode;
  volMult: number;
  confMult: number;
  liqMult: number;
  globalSizeMultiplier: number;
  modelVersion: string;
  timestamp: string;
}

export interface SizingResult {
  riskBudgetUsd: number;
  invalidationDistance: number;
  positionSizeQty: number;
  positionNotionalUsd: number;
  stopPrice: number;
  takeProfitP50: number;
  takeProfitP95: number;
  riskFractionBps: number;
}

export interface ExecutionRunResult {
  runId: string;
  runType: string;
  startedAt: Date;
  finishedAt: Date;
  setupsEvaluated: number;
  decisionsCreated: number;
  decisionsRejected: number;
  decisionsWait: number;
  errors: number;
  runChecksum: string;
}
