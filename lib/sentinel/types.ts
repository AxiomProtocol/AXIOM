export type {
  RegimeState,
  SignalDirection,
  DecisionOutcome,
  ActionType,
  SignalEvent,
  RegimeSnapshot,
  ConfirmationResult,
  AuthorizationDecision,
  PortfolioAllocation,
  PortfolioOutput,
  CalibrationResult,
} from '../../server/services/sentinel/types';

export type SentinelOperationalState = 'NORMAL' | 'SAFE_MODE' | 'DEFENSIVE_MODE' | 'RECOVERY_PENDING';

export interface SentinelHealthStatus {
  operationalState: SentinelOperationalState;
  lastAuthorizationAt: string | null;
  lastHealthCheckAt: string;
  latencyMs: number;
  consecutiveFailures: number;
  stateEnteredAt: string;
  stateDurationMs: number;
  recoveryConfirmedBy: string | null;
}

export interface StateTransition {
  id: string;
  priorState: SentinelOperationalState;
  newState: SentinelOperationalState;
  triggerCondition: string;
  timestamp: string;
  durationInPriorState: number;
  metadata?: Record<string, any>;
}

export type SentinelAlertEvent = 'SentinelDegraded' | 'SentinelOffline' | 'SentinelHealthRestored' | 'SentinelRecoveryConfirmed';

export interface SentinelAlert {
  event: SentinelAlertEvent;
  state: SentinelOperationalState;
  timestamp: string;
  message: string;
  metadata?: Record<string, any>;
}

export type PilotActionType =
  | 'ContributionReceived'
  | 'CapitalCallIssued'
  | 'CapitalCallFunded'
  | 'AssetPurchased'
  | 'ReserveAllocation'
  | 'DistributionCalculated'
  | 'DistributionApproved'
  | 'DistributionPaid'
  | 'ValuationUpdated'
  | 'ConfigurationChanged'
  | 'DocumentUploaded'
  | 'ReportGenerated'
  | 'EulerEarnRebalance'
  | 'TreasuryVaultRebalance';

export type PilotDecisionOutcome = 'APPROVED' | 'DENIED' | 'CONDITIONAL';

export interface PilotAuthorizationRequest {
  actionType: PilotActionType;
  spvId?: string;
  capitalImpact: number;
  metadata?: Record<string, any>;
}

export interface PilotAuthorizationResult {
  decision: PilotDecisionOutcome;
  reason: string;
  constraints?: {
    maxCapitalAllowed?: number;
    sizingAdjustment?: number;
    conditions?: string[];
  };
  decisionId: string;
  regime: string;
  stance: string;
  criteriaMet: string[];
  criteriaFailed?: string[];
}

export type RealEstateStressRegime = 'RATE_SHOCK' | 'VACANCY_SHOCK' | 'EXPENSE_SHOCK' | 'LIQUIDITY_SHOCK';

export interface PortfolioExposureControls {
  totalProgramExposureLimit: number;
  perSpvExposureLimit: number;
  directionalConcentrationLimit: number;
  reserveMinimumConstraint: number;
}

export interface DrawdownTrigger {
  type: 'NOI_BELOW_PROJECTION' | 'OCCUPANCY_BELOW_THRESHOLD' | 'EXPENSE_OVERRUN' | 'RESERVE_COMPRESSION';
  threshold: number;
  currentValue: number;
  triggered: boolean;
}

export interface DrawdownResponse {
  triggers: DrawdownTrigger[];
  action: 'REDUCE_DEPLOYMENT' | 'TIGHTEN_APPROVALS' | 'PRIORITIZE_RESERVES' | 'FREEZE_GROWTH' | 'NONE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export const TREASURY_POLICY = {
  distributions: 0.35,
  reserves: 0.35,
  growth: 0.20,
  operatingBuffer: 0.10,
} as const;

export const RISK_ACTION_CLASSIFICATION: Record<PilotActionType, 'HIGH' | 'MEDIUM' | 'LOW'> = {
  AssetPurchased: 'HIGH',
  CapitalCallIssued: 'HIGH',
  DistributionApproved: 'HIGH',
  CapitalCallFunded: 'MEDIUM',
  DistributionCalculated: 'MEDIUM',
  DistributionPaid: 'MEDIUM',
  ReserveAllocation: 'MEDIUM',
  ValuationUpdated: 'MEDIUM',
  ContributionReceived: 'LOW',
  ConfigurationChanged: 'LOW',
  DocumentUploaded: 'LOW',
  ReportGenerated: 'LOW',
  EulerEarnRebalance: 'MEDIUM',
  TreasuryVaultRebalance: 'HIGH',
};

export type ScoreBand = 'WEAK' | 'MODERATE' | 'STRONG' | 'EXCEPTIONAL';

export function getScoreBand(score: number): ScoreBand {
  if (score >= 0.70) return 'EXCEPTIONAL';
  if (score >= 0.50) return 'STRONG';
  if (score >= 0.31) return 'MODERATE';
  return 'WEAK';
}

export const SCORE_BAND_LABELS: Record<ScoreBand, { label: string; color: string; bgColor: string }> = {
  WEAK: { label: 'Weak', color: 'text-dl-error', bgColor: 'bg-red-50' },
  MODERATE: { label: 'Moderate', color: 'text-dl-gold', bgColor: 'bg-yellow-50' },
  STRONG: { label: 'Strong', color: 'text-dl-forest', bgColor: 'bg-green-50' },
  EXCEPTIONAL: { label: 'Exceptional', color: 'text-dl-navy', bgColor: 'bg-blue-50' },
};

export const REGIME_DISPLAY: Record<string, { label: string; color: string; bgColor: string; description: string }> = {
  TREND_UP: { label: 'Trend Up', color: 'text-dl-forest', bgColor: 'bg-green-50', description: 'Market showing sustained upward momentum. Moving averages aligned bullishly. Standard allocation permitted.' },
  TREND_DOWN: { label: 'Trend Down', color: 'text-dl-error', bgColor: 'bg-red-50', description: 'Market showing sustained downward momentum. Moving averages aligned bearishly. Reduced allocation applied.' },
  RANGE_LOW_VOL: { label: 'Range / Low Vol', color: 'text-dl-gray', bgColor: 'bg-gray-50', description: 'Market trading within a defined range with low volatility. No clear directional bias. Standard allocation applied.' },
  HIGH_VOL_DISLOCATION: { label: 'High Vol Dislocation', color: 'text-dl-gold', bgColor: 'bg-yellow-50', description: 'Market experiencing elevated volatility with dislocated price action. All non-parameter capital deployment suspended.' },
};

export interface SentinelOverview {
  regime: string;
  regimeConfidence: number;
  stance: string;
  operationalState: SentinelOperationalState;
  totalSignals: number;
  qualifiedSignals: number;
  approvedCount: number;
  deniedCount: number;
  lastUpdated: string;
}

export interface SentinelSignalRow {
  id: string;
  symbol: string;
  assetType: string;
  direction: string;
  entryMid: number;
  finalScore: number | null;
  regimeState: string;
  qualified: boolean;
  createdAt: string;
  scoreBand: ScoreBand | null;
}

export interface SentinelDecisionRow {
  id: string;
  scope: string;
  actionType: string;
  subject: string;
  maxNotional: number;
  decision: string;
  reasonCode: string;
  plainLanguage: string;
  createdAt: string;
}

export interface RegimeHistoryEntry {
  id: string;
  regime: string;
  confidence: number;
  createdAt: string;
}

export interface SentinelDisciplineKPIs {
  authorizationComplianceRate: number;
  reserveStabilityRatio: number;
  denialRateDuringStress: number;
  concentrationViolationsPrevented: number;
  drawdownResponseMetrics: {
    triggersActivated: number;
    avgResponseTimeMs: number;
  };
}
