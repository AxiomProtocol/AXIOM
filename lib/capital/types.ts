export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type AccountSubtype = 'CASH' | 'TRADING' | 'FEE_RESERVE' | 'UNREALIZED' | 'REALIZED' | 'OPERATING';
export type PositionStatus = 'OPEN' | 'CLOSED';
export type TradeSide = 'BUY' | 'SELL';
export type FeeType = 'TRADING' | 'NETWORK' | 'MANAGEMENT' | 'ADJUSTMENT';
export type DrawdownStatus = 'ACTIVE' | 'RECOVERED';
export type RiskSeverity = 'INFO' | 'WARNING' | 'ELEVATED' | 'CRITICAL';
export type SnapshotSource = 'MIRDT' | 'MANUAL' | 'SENTINEL' | 'SYSTEM';

export interface Account {
  id: string;
  name: string;
  accountType: AccountType;
  subtype: AccountSubtype;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  txGroupId: string;
  accountId: string;
  debitAmount: string;
  creditAmount: string;
  currency: string;
  description: string;
  externalId: string | null;
  sourceType: string;
  createdAt: string;
}

export interface Position {
  id: string;
  instrument: string;
  venue: string;
  strategyId: string | null;
  status: PositionStatus;
  side: TradeSide;
  quantity: string;
  avgEntryPrice: string;
  avgExitPrice: string | null;
  realizedPnl: string | null;
  openedAt: string;
  closedAt: string | null;
}

export interface Trade {
  id: string;
  positionId: string;
  side: TradeSide;
  quantity: string;
  price: string;
  venue: string;
  executedAt: string;
  externalId: string | null;
}

export interface Fee {
  id: string;
  tradeId: string | null;
  feeType: FeeType;
  amount: string;
  currency: string;
  description: string;
  incurredAt: string;
}

export interface PriceMark {
  id: string;
  instrument: string;
  price: string;
  source: string;
  markedAt: string;
}

export interface Snapshot {
  id: string;
  asOf: string;
  checksum: string;
  sourcesUsed: string[];
  confidence: string;
  warnings: string[];
  regimeBand: string | null;
  policyState: string | null;
  createdAt: string;
}

export interface SnapshotLine {
  id: string;
  snapshotId: string;
  metricKey: string;
  metricValue: string;
  period: string;
  instrument: string | null;
}

export interface Drawdown {
  id: string;
  peakValue: string;
  troughValue: string;
  depthPct: string;
  peakAt: string;
  troughAt: string;
  recoveredAt: string | null;
  status: DrawdownStatus;
  snapshotId: string | null;
}

export interface DriftPoint {
  id: string;
  asOf: string;
  expectedValue: string;
  actualValue: string;
  variancePct: string;
  snapshotId: string | null;
}

export interface DecisionLogEntry {
  id: string;
  snapshotId: string | null;
  setupId: string | null;
  positionId: string | null;
  action: string;
  rationale: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface RiskFlag {
  id: string;
  severity: RiskSeverity;
  category: string;
  explanation: string;
  snapshotId: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface CapitalMetrics {
  realizedPnl: number;
  unrealizedPnl: number;
  feesTotal: number;
  netCapitalChange: number;
  returnOnCapital: number;
  returnOnDeployedCapital: number;
  capitalEfficiencyScore: number;
  varianceStabilityIndex: number;
  maxDrawdown: number;
  recoveryDuration: number | null;
  capitalDrift: number;
  totalDeployed: number;
  totalCapital: number;
  openPositionCount: number;
  closedPositionCount: number;
}

export interface PeriodMetrics extends CapitalMetrics {
  period: string;
  periodStart: string;
  periodEnd: string;
}

export interface ApiMeta {
  as_of: string;
  sources_used: string[];
  confidence: string;
  warnings: string[];
}

export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
  error?: string;
}

export interface StatementRow {
  period: string;
  realizedPnl: number;
  unrealizedPnl: number;
  feesTotal: number;
  netCapitalChange: number;
  returnOnCapital: number;
  tradeCount: number;
}
