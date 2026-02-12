export type PolicyMode = 'BOOTSTRAP' | 'NORMAL' | 'CAUTION' | 'RESTRICTED' | 'EMERGENCY';
export type ViewMode = 'allocator' | 'clearinghouse' | 'regulatory';

export interface SolvencyMetrics {
  schemaVersion: string;
  dataStatus: 'ok' | 'empty' | 'partial';
  asOfUtc: string;
  snapshotId: string;
  checksum: string;
  treasuryTotalUsd: number;
  treasuryLiquidUsd: number;
  reservesTotalUsd: number;
  liabilitiesTotalUsd: number;
  reserveRatio: number;
  coverageRatio: number;
  lossBufferUsd: number;
  policyMode: PolicyMode;
  regimeState: string;
  hardBrake: string;
  gateStatus: string;
  composition: CompositionItem[];
  limitations: string[];
  sources: SourceItem[];
}

export interface CompositionItem {
  label: string;
  valueUsd: number;
  pct: number;
}

export interface SourceItem {
  label: string;
  detail: string;
}

export interface StressScenario {
  id: string;
  label: string;
  description: string;
  treasuryDrawdownPct: number;
  reserveDrawdownPct: number;
  liabilityIncreasePct: number;
  ethPriceChangePct: number;
}

export interface StressResult {
  scenario: StressScenario;
  adjustedTreasuryUsd: number;
  adjustedReservesUsd: number;
  adjustedLiabilitiesUsd: number;
  adjustedCoverageRatio: number;
  adjustedReserveRatio: number;
  adjustedLossBufferUsd: number;
  resultingPolicyMode: PolicyMode;
  breachesThreshold: boolean;
}

export interface HistoryPoint {
  asOfUtc: string;
  treasuryTotalUsd: number;
  reservesTotalUsd: number;
  liabilitiesTotalUsd: number;
  coverageRatio: number;
  reserveRatio: number;
  policyMode: PolicyMode;
}

export interface AxusdStabilityMetrics {
  totalSupply: number;
  psmReserves: number;
  backingRatio: number;
  pegDeviation: number;
  redemptionCapacity: number;
  stabilityScore: 'STRONG' | 'ADEQUATE' | 'WEAK' | 'CRITICAL';
}
