/**
 * Institutional Observer Dashboard - TypeScript Interfaces
 * 
 * Read-only data types for governance and treasury transparency.
 * All data derived from on-chain state and events.
 */

// Contract addresses on Arbitrum One
export const OBSERVER_CONTRACTS = {
  TimelockController: '0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899',
  GovernanceConfig: '0xa645a0Fcc15dD22Ee44d774F19731Fb0fE70b2CC',
  GovernanceHub: '0x52Dc85fd653a75323b5307f4D2629ab9A070530E',
  TreasuryHub: '0x3fD63728288546AC41dAe3bf25ca383061c3A929',
  AxiomV2: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D',
  veAXM: '0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046',
  RiskConfig: '0xD9a53c691B688351283Fecc33D8D9AF964A9a078',
  DSCRRiskConfig: '0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26',
  FixFlipManager: '0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958',
  DSCRLoanManager: '0x105117F1AD1B65a5d0C7F0E9A870683A06738E16',
  AxiomScoreSBT: '0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008',
} as const;

// Overview Page Types
export interface OverviewMetrics {
  treasuryTotal: {
    eth: string;
    usd: string;
  };
  bucketTotals: BucketBalances;
  flows: {
    inflows7d: string;
    inflows30d: string;
    inflows90d: string;
    outflows7d: string;
    outflows30d: string;
    outflows90d: string;
  };
  governanceStatus: {
    paused: boolean;
    lendingPaused: boolean;
    parameterHash: string;
    timelockLocked: boolean;
  };
  riskPosture: {
    maxExposure: string;
    currentExposure: string;
    utilizationPercent: number;
  };
  latestActions: GovernanceAction[];
  lastUpdated: string;
}

// Treasury Page Types
export interface BucketBalances {
  operating: string;
  maintenance: string;
  growth: string;
  longTerm: string;
}

export interface RoutingRule {
  bucket: 'operating' | 'maintenance' | 'growth' | 'longTerm';
  allocationPercent: number;
  minReserve: string;
  priority: number;
}

export interface DrawSchedule {
  date: string;
  amount: string;
  recipient: string;
  purpose: string;
  status: 'scheduled' | 'executed' | 'cancelled';
}

export interface TreasuryEvent {
  id: string;
  type: 'deposit' | 'route' | 'draw' | 'sweep';
  timestamp: string;
  amount: string;
  actor: string;
  bucket?: string;
  txHash: string;
  blockNumber: number;
}

export interface TreasuryData {
  buckets: BucketBalances;
  routingRules: RoutingRule[];
  drawSchedule: DrawSchedule[];
  events: TreasuryEvent[];
  lastUpdated: string;
}

// Governance Page Types
export interface RoleHolder {
  role: string;
  roleHash: string;
  holder: string;
  holderType: 'safe' | 'eoa' | 'contract';
  grantedAt: string;
  grantedBlock: number;
  grantedTx: string;
}

export interface ParameterEntry {
  name: string;
  contract: string;
  currentValue: string;
  lastChanged: string;
  changedBy: string;
  txHash: string;
}

export interface TimelockOperation {
  id: string;
  target: string;
  targetName: string;
  functionName: string;
  functionSelector: string;
  calldata: string;
  value: string;
  predecessor: string;
  eta: string;
  status: 'pending' | 'ready' | 'executed' | 'cancelled';
  scheduledAt: string;
  scheduledTx: string;
}

export interface EmergencyControl {
  name: string;
  holder: string;
  holderRole: string;
  policy: 'immediate' | 'timelocked';
  currentState: 'active' | 'inactive' | 'n/a';
}

export interface GovernanceData {
  roles: RoleHolder[];
  parameters: ParameterEntry[];
  timelockQueue: TimelockOperation[];
  emergencyControls: EmergencyControl[];
  timelockStatus: {
    minDelay: number;
    maxDelay: number;
    configurationLocked: boolean;
    lockTimestamp?: string;
    lockedBy?: string;
  };
  lastUpdated: string;
}

// Risk Page Types
export interface ExposureMetric {
  name: string;
  limit: string;
  current: string;
  utilization: number;
  status: 'safe' | 'warning' | 'critical';
}

export interface ConcentrationEntry {
  name: string;
  type: 'asset' | 'counterparty' | 'pool';
  exposure: string;
  percentOfTotal: number;
}

export interface RedFlag {
  id: string;
  type: 'invariant' | 'event_gap' | 'oracle' | 'pause' | 'circuit_breaker';
  status: 'ok' | 'warning' | 'critical';
  message: string;
  detectedAt?: string;
  txHash?: string;
}

export interface RiskData {
  exposureMetrics: ExposureMetric[];
  concentration: ConcentrationEntry[];
  redFlags: RedFlag[];
  circuitBreakerStatus: {
    triggered: boolean;
    triggeredAt?: string;
    reason?: string;
  };
  lastUpdated: string;
}

// Assets Page Types
export interface AssetEntry {
  id: string;
  type: 'real_estate' | 'depin' | 'token' | 'other';
  name: string;
  status: 'active' | 'pending' | 'deprecated';
  registeredAt: string;
  registeredTx: string;
  monthlyRevenue?: string;
  totalRevenue?: string;
}

export interface RevenueStream {
  source: string;
  sourceContract: string;
  mtd: string;
  ytd: string;
  lastPayment: string;
}

export interface LifecycleAction {
  date: string;
  assetId: string;
  assetName: string;
  action: 'acquire' | 'maintain' | 'deprecate' | 'transfer';
  actor: string;
  txHash: string;
}

export interface AssetsData {
  registry: AssetEntry[];
  revenueStreams: RevenueStream[];
  lifecycleActions: LifecycleAction[];
  lastUpdated: string;
}

// Reports Page Types
export interface IntegrityCheck {
  name: string;
  status: 'pass' | 'fail' | 'pending';
  lastRun: string;
  details?: string;
}

export interface ExportConfig {
  format: 'json' | 'csv' | 'pdf';
  dateRange: {
    start: string;
    end: string;
  };
  includeEvents: boolean;
  includeParameters: boolean;
  includeBalances: boolean;
}

export interface ReportsData {
  integrityChecks: IntegrityCheck[];
  availableExports: ('json' | 'csv' | 'pdf')[];
  lastExport?: {
    format: string;
    timestamp: string;
    hash: string;
  };
  lastUpdated: string;
}

// Governance Action (for latest actions display)
export interface GovernanceAction {
  id: string;
  type: 'role_grant' | 'role_revoke' | 'parameter_change' | 'timelock_schedule' | 'timelock_execute' | 'pause' | 'unpause' | 'emergency';
  description: string;
  actor: string;
  target?: string;
  timestamp: string;
  txHash: string;
  blockNumber: number;
}

// Proof Link for verification
export interface ProofLink {
  type: 'tx' | 'block' | 'address';
  value: string;
  url: string;
  label?: string;
}

// API Response wrapper
export interface ObserverResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  cached: boolean;
  cacheAge?: number;
  proofLinks: ProofLink[];
}

// Lock Readiness Types
export interface LockCriterion {
  id: string;
  name: string;
  status: 'passing' | 'pending' | 'failing';
  note?: string;
}

export interface LockGate {
  name: string;
  criteria: LockCriterion[];
  passingCount: number;
  totalCount: number;
  status: 'green' | 'yellow' | 'red';
}

export interface LockReadinessData {
  hardeningActive: boolean;
  windowStart: string;
  earliestLockReview: string;
  latestLockReview: string;
  daysElapsed: number;
  daysRemaining: number;
  gates: {
    governance: LockGate;
    treasury: LockGate;
    observability: LockGate;
    operations: LockGate;
  };
  overallStatus: 'ready' | 'in_progress' | 'blocked';
  passingCriteria: number;
  totalCriteria: number;
  lastUpdated: string;
}
