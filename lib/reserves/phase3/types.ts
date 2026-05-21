/**
 * lib/reserves/phase3/types.ts
 *
 * Phase 3 — Oracle and NAV Adapter type definitions.
 *
 * All types here are ADDITIVE — Phase 2 types are not modified.
 * Phase 3 adds richer valuation metadata that the ReserveManager
 * consumes to produce more precise reserve accounting output.
 */

// ── Oracle Source Types ───────────────────────────────────────────────────────

export type OracleSourceType =
  | 'FIXED_PEG'                    // Hardcoded $1.00 (USDC)
  | 'CHAINLINK'                    // On-chain Chainlink price feed
  | 'ERC4626_CONVERT_TO_ASSETS'    // Tokenized fund convertToAssets()
  | 'ISSUER_NAV_API'               // Issuer-reported NAV (off-chain API)
  | 'CUSTODIAN_ATTESTATION'        // BitGo or equivalent custody attestation
  | 'MANUAL_OPERATOR_INPUT'        // Emergency fallback, time-limited
  | 'DEX_TWAP'                     // DEX TWAP — secondary observation only
  | 'INTERNAL_ACCOUNTING'          // Operator treasury internal valuation
  | 'FALLBACK_COMPOSITE';          // Weighted average when primary fails

// ── Valuation Freshness State ─────────────────────────────────────────────────

export type ValuationFreshnessState =
  | 'FRESH'                        // Within staleness threshold
  | 'APPROACHING_STALE'            // Within 80% of staleness threshold
  | 'STALE'                        // Past staleness threshold
  | 'EXPIRED'                      // 2x past staleness threshold
  | 'MANUAL_REVIEW_REQUIRED'       // Operator review gate triggered
  | 'UNUSABLE';                    // Cannot be used for any accounting

// ── Fallback State ────────────────────────────────────────────────────────────

export type FallbackState =
  | 'PRIMARY_HEALTHY'              // Primary oracle is fresh and usable
  | 'USING_FALLBACK'               // Primary stale/failed, fallback healthy
  | 'BOTH_STALE'                   // Both primary and fallback are stale
  | 'BOTH_FAILED'                  // Both primary and fallback failed
  | 'MANUAL_OVERRIDE_ACTIVE'       // Manual override is in effect
  | 'MANUAL_OVERRIDE_EXPIRED'      // Manual override has expired
  | 'UNUSABLE';                    // No usable source available

// ── NAV Observation ───────────────────────────────────────────────────────────

export interface NAVObservation {
  assetId: string;
  assetAddress: string;
  chainId: number;
  symbol: string;

  /** Gross NAV per token in quoteCurrency. Null if not retrievable. */
  grossNavPerToken: number | null;
  quoteCurrency: string;
  decimals: number;

  timestamp: string;
  sourceName: string;
  sourceType: OracleSourceType;
  sourceUrl: string | null;

  /** Confidence score 0–100. */
  confidenceScore: number;
  freshnessState: ValuationFreshnessState;

  /**
   * Live attestation status sourced at observation fetch time.
   * When set, rwaValuationAdapter uses this over asset.custody.attestationStatus.
   * This ensures live BitGo results (not static registry metadata) gate eligibility.
   */
  liveAttestationStatus?: 'NONE' | 'PENDING' | 'CURRENT' | 'STALE' | 'FAILED' | 'MANUAL_REVIEW';

  isStale: boolean;
  isFallback: boolean;
  isManuallyReviewed: boolean;
  isUsable: boolean;
  unusableReason: string | null;
}

// ── Valuation Result ──────────────────────────────────────────────────────────

export interface ValuationResult {
  assetId: string;
  symbol: string;

  /** Raw NAV value before haircut adjustments. */
  grossValueUsd: number | null;
  /** Base haircut in bps (from asset policy). */
  baseHaircutBps: number;
  /** Effective haircut after stale/fallback expansions. */
  effectiveHaircutBps: number;
  /** Eligible value after effective haircut. Always 0 for PLANNED/INTERNAL_ONLY. */
  eligibleReserveValueUsd: number;

  source: OracleSourceType;
  valuationTimestamp: string | null;
  freshnessState: ValuationFreshnessState;
  fallbackState: FallbackState;

  attestationStatus: 'NONE' | 'PENDING' | 'CURRENT' | 'STALE' | 'FAILED' | 'MANUAL_REVIEW';
  reconciliationStatus: 'NOT_REQUIRED' | 'PENDING' | 'CURRENT' | 'OVERDUE' | 'FAILED';

  isStale: boolean;
  isFallback: boolean;
  isManuallyReviewed: boolean;
  isEligible: boolean;
  exclusionReason: string | null;

  confidenceScore: number;
}

// ── Oracle Source ─────────────────────────────────────────────────────────────

export interface OracleSource {
  id: string;
  name: string;
  type: OracleSourceType;
  description: string;
  supportedAssets: string[];      // asset IDs
  supportedSleeves: string[];     // sleeve IDs
  priorityRank: number;           // lower = higher priority
  isPrimary: boolean;
  isFallback: boolean;
  isActive: boolean;
  isDeprecated: boolean;
  maxStalenessSeconds: number;
  requiresAttestation: boolean;
  requiresManualReview: boolean;
  referenceUrl: string | null;
  notes: string;
}

// ── Valuation Policy ──────────────────────────────────────────────────────────

export interface ValuationPolicy {
  assetId: string;
  symbol: string;

  primarySourceId: string;
  fallbackSourceId: string | null;

  maxStalenessSeconds: number;
  minConfidenceScore: number;

  /** Additional bps to add to base haircut when valuation is stale. */
  haircutExpansionOnStaleBps: number;
  /** Additional bps to add to base haircut when using fallback source. */
  haircutExpansionOnFallbackBps: number;

  eligibleWhenStale: boolean;
  eligibleWhenFallback: boolean;
  eligibleWhenAttestationMissing: boolean;

  attestationRequired: boolean;
  manualReviewRequired: boolean;

  /** Behavior when emergencyDisabled: 'EXCLUDE' | 'EXPAND_HAIRCUT' */
  emergencyDisableBehavior: 'EXCLUDE' | 'EXPAND_HAIRCUT';

  notes: string;
}

// ── Confidence Score Params ───────────────────────────────────────────────────

export interface ConfidenceScoreParams {
  sourceType: OracleSourceType;
  freshnessState: ValuationFreshnessState;
  attestationStatus: 'NONE' | 'PENDING' | 'CURRENT' | 'STALE' | 'FAILED' | 'MANUAL_REVIEW';
  reconciliationStatus: 'NOT_REQUIRED' | 'PENDING' | 'CURRENT' | 'OVERDUE' | 'FAILED';
  isFallback: boolean;
  isManuallyReviewed: boolean;
  isAssetLive: boolean;
  attestationRequired: boolean;
}

// ── Reserve Snapshot Buckets ──────────────────────────────────────────────────

export type SnapshotBucket =
  | 'LIVE_RESERVE'          // LIVE, eligible, fresh
  | 'PLANNED'               // PLANNED, valuation-only, zero eligible
  | 'EXCLUDED_OPERATOR'     // OPERATOR_TREASURY, excluded
  | 'STALE'                 // LIVE but stale, excluded or expanded haircut
  | 'MANUAL_REVIEW'         // Requires human review
  | 'ATTESTATION_PENDING'   // Missing required attestation
  | 'EMERGENCY_DISABLED';   // emergencyDisabled=true

export interface ReserveSnapshotAsset {
  assetId: string;
  symbol: string;
  sleeve: string;
  status: string;
  bucket: SnapshotBucket;

  grossBalance: number | null;
  grossValueUsd: number | null;
  eligibleValueUsd: number;

  valuationSource: OracleSourceType;
  valuationTimestamp: string | null;
  confidenceScore: number;
  freshnessState: ValuationFreshnessState;
  fallbackState: FallbackState;

  isStale: boolean;
  isFallback: boolean;
  hasAttestation: boolean;
  isManualReview: boolean;
  exclusionReason: string | null;

  baseHaircutBps: number;
  effectiveHaircutBps: number;
}

export interface ReserveSnapshot {
  fetchedAt: string;
  liveReserveAssets: ReserveSnapshotAsset[];
  plannedAssets: ReserveSnapshotAsset[];
  excludedOperatorAssets: ReserveSnapshotAsset[];
  staleAssets: ReserveSnapshotAsset[];
  manualReviewAssets: ReserveSnapshotAsset[];
  attestationPendingAssets: ReserveSnapshotAsset[];

  totalEligibleValueUsd: number;
  totalGrossValueUsd: number;
  staleValueUsd: number;
  manualReviewValueUsd: number;
  fallbackValuedAmountUsd: number;
  plannedGrossValueUsd: number;

  warnings: string[];
}
