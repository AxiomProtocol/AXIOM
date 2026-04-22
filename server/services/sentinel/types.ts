export type RegimeState = 'TREND_UP' | 'TREND_DOWN' | 'RANGE_LOW_VOL' | 'HIGH_VOL_DISLOCATION';
export type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL';
export type DecisionOutcome = 'APPROVED' | 'DENIED';
export type ActionType = 'TREASURY_DEPLOY' | 'LEND_ISSUE' | 'MINT' | 'BURN' | 'PARAMETER_CHANGE' | 'SWAP' | 'LP_ACTION' | 'BRIDGE';

export interface SignalEvent {
  id?: string;
  symbol: string;
  assetType: 'CRYPTO' | 'EQUITY';
  timeframe: string;
  horizonDays: number;
  direction: SignalDirection;
  entryZoneLow: number;
  entryZoneHigh: number;
  entryMid: number;
  invalidationLevel: number;
  pRaw: number;
  pCalibrated?: number;
  regimeState: RegimeState;
  confirmationScore?: number;
  finalScore?: number;
  volEstimate: number;
  liquidityScore?: number;
  modelVersion: string;
  dataSnapshotRef?: string;
  sourceSetupId?: string;
  rationaleJson?: any;
}

export interface RegimeSnapshot {
  regime: RegimeState;
  confidence: number;
  sma20Slope: number;
  sma50Slope: number;
  volatility20d: number;
  volatilityRatio: number;
  breadthScore: number;
  notes?: string;
  snapshotJson?: any;
}

export interface ConfirmationResult {
  score: number;
  multiTimeframeAligned: boolean;
  signalPersistence: number;
  volumeConfirmed: boolean;
  riskRewardAcceptable: boolean;
  liquidityAdequate: boolean;
  details: Record<string, any>;
}

export interface AuthorizationDecision {
  id?: string;
  scope: string;
  actionType: ActionType;
  subject: string;
  maxNotional: number;
  expiresAt: Date;
  decision: DecisionOutcome;
  reasonCode: string;
  plainLanguage: string;
  signalId?: string;
  logHash: string;
  prevHash: string;
  signature?: string;
  nonce: number;
}

export interface PortfolioAllocation {
  symbol: string;
  direction: SignalDirection;
  weight: number;
  notional: number;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  signalId: string;
  finalScore: number;
}

export interface PortfolioOutput {
  allocations: PortfolioAllocation[];
  totalDeployed: number;
  totalIdle: number;
  deployedPct: number;
  correlationExposure: number;
  timestamp: Date;
}

export interface CalibrationResult {
  modelVersion: string;
  totalSignals: number;
  calibrationMethod: string;
  brierScore: number;
  ece: number;
  reliabilityJson: any;
  regimeSplitJson: any;
}
