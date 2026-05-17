export type ChainId = 42161;

export type LiquidityAssetSymbol = 'USDC' | 'AXUSD' | 'AXM' | 'AXAU';

export type LiquidityAssetRole =
  | 'external_stable_quote'
  | 'stable_settlement_spine'
  | 'governance_coordination'
  | 'reserve_linked';

export type LiquidityVenueId =
  | 'uniswap-v3'
  | 'curve'
  | 'balancer'
  | 'camelot'
  | 'uniswap-v3-polygon';

export type LiquidityVenueStatus =
  | 'approved_primary'
  | 'approved_secondary'
  | 'evaluation_only'
  | 'deferred'
  | 'existing_integration';

export type LiquidityPoolStatus =
  | 'planned'
  | 'active'
  | 'inactive'
  | 'blocked'
  | 'evaluation';

export type LiquidityLaunchPhase =
  | 'phase_1'
  | 'phase_2'
  | 'phase_3'
  | 'conditional_axau';

export type TreasuryPriority = 'highest' | 'high' | 'medium' | 'low' | 'none';

export type TargetDepthPriority = 'deepest_launch_pool' | 'controlled_smaller_pool' | 'deferred_depth' | 'none';

export type ParitySensitivity = 'critical' | 'high' | 'medium' | 'low' | 'not_applicable';

export type ComplianceRiskLevel = 'low' | 'medium' | 'high' | 'blocked';

export interface LiquidityChain {
  id: ChainId;
  name: 'Arbitrum One';
  explorerUrl: string;
}

export interface LiquidityAsset {
  symbol: LiquidityAssetSymbol;
  name: string;
  address: string;
  decimals: number;
  chain: LiquidityChain;
  role: LiquidityAssetRole;
  isStable: boolean;
  isGovernance: boolean;
  isReserveLinked: boolean;
  publicAmmTradingPermitted: boolean;
  restrictedTransferLogicExists: boolean;
  wrapperRequired: boolean;
  launchPriority: number;
  preferredQuoteAsset: LiquidityAssetSymbol | null;
  approvedVenues: LiquidityVenueId[];
  blockedVenues: LiquidityVenueId[];
  notes: string;
  rationale: string;
}

export interface LiquidityVenue {
  id: LiquidityVenueId;
  name: string;
  chain: LiquidityChain;
  status: LiquidityVenueStatus;
  firstWavePermitted: boolean;
  approvedForAssets: LiquidityAssetSymbol[];
  blockedForAssets: LiquidityAssetSymbol[];
  notes: string;
}

export interface LiquidityPoolFee {
  kind: 'uniswap_v3_fee_tier' | 'curve_stableswap' | 'balancer_weighted' | 'camelot_pool' | 'uniswap_v3_polygon';
  valueBps: number | null;
  status: 'recommended' | 'pending_venue_design' | 'existing';
  notes: string;
}

export interface LiquidityPoolDefinition {
  id: string;
  baseAsset: LiquidityAssetSymbol;
  quoteAsset: LiquidityAssetSymbol;
  venue: LiquidityVenueId;
  fee: LiquidityPoolFee;
  launchPhase: LiquidityLaunchPhase;
  status: LiquidityPoolStatus;
  active: boolean;
  treasuryPriority: TreasuryPriority;
  targetDepthPriority: TargetDepthPriority;
  paritySensitivity: ParitySensitivity;
  complianceRiskLevel: ComplianceRiskLevel;
  deploymentAddress: string | null;
  activationFlag: string;
  readinessChecks: string[];
  riskFlags: string[];
  complianceFlags: string[];
  analyticsHooks: string[];
  adminControls: string[];
  internalNotes: string;
}

export interface LiquidityTreasuryPolicy {
  deepestPoolAtLaunch: string;
  controlledSmallerPoolAtLaunch: string;
  noAllocationToNonCorePoolsAtLaunch: boolean;
  axusdParityDefensePriority: 'highest';
  fragmentationAvoidance: 'strict';
  secondaryVenueActivationRequiresReadinessChecks: boolean;
  launchSequence: Array<{
    phase: LiquidityLaunchPhase;
    label: string;
    poolIds: string[];
    activationCondition: string;
  }>;
  allocationRules: string[];
  expansionRules: string[];
  blockedRules: string[];
}

export interface AxauCompatibilityChecklist {
  unrestrictedErc20BehaviorConfirmed: boolean;
  transferThroughUserWalletsConfirmed: boolean;
  transferThroughPoolContractsConfirmed: boolean;
  transferThroughRouterContractsConfirmed: boolean;
  complianceLogicDoesNotBreakSwaps: boolean;
  holderRestrictionsDoNotBreakPublicMarketFlows: boolean;
  wrapperRequired: boolean;
  wrapperDesignApproved: boolean;
  governanceApprovalRecorded: boolean;
  approvedForPublicAmm: boolean;
  evidence: Record<string, string>;
  notes: string[];
}

export interface AxauCompatibilityDecision {
  approved: boolean;
  status: 'go' | 'no_go';
  blockingReasons: string[];
  checklist: AxauCompatibilityChecklist;
}

export interface LiquidityDeploymentInput {
  poolId: string;
  venue: LiquidityVenueId;
  chainId: ChainId;
  baseAsset: LiquidityAssetSymbol;
  quoteAsset: LiquidityAssetSymbol;
  requiredAddresses: Array<{
    label: string;
    value: string | null;
    source: string;
  }>;
  recommendedParameters: Array<{
    label: string;
    value: string;
    status: 'recommended' | 'pending' | 'blocked';
  }>;
  environmentVariables: string[];
  preflightChecks: string[];
  blockedUntil: string[];
}

export interface LiquidityMetricDefinition {
  poolId: string;
  metrics: Array<'depth' | 'slippage' | 'price_deviation' | 'volume' | 'venue_health' | 'parity_sensitivity' | 'treasury_exposure' | 'pool_readiness'>;
  status: 'scaffolded' | 'wired';
  notes: string;
}
