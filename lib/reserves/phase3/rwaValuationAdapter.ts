/**
 * lib/reserves/phase3/rwaValuationAdapter.ts
 *
 * Phase 3 — RWAValuationAdapter
 *
 * Unified entry point for valuing any registry asset.
 * Takes an ApprovedReserveAsset, its ValuationPolicy, and a NAVObservation
 * and returns a structured ValuationResult.
 *
 * Enforcement invariants:
 *   (a) PLANNED assets → eligibleReserveValueUsd = 0 regardless of NAV
 *   (b) INTERNAL_ONLY and OPERATOR_TREASURY → eligibleReserveValueUsd = 0
 *   (c) Stale + eligibleWhenStale=false → eligible = 0
 *   (d) Fallback + eligibleWhenFallback=false → eligible = 0
 *   (e) Missing attestation + eligibleWhenAttestationMissing=false → eligible = 0
 *   (f) Haircut expansion on stale/fallback applied before computing eligible
 *   (g) Adapter never overrides ReserveManager Phase 2 eligibility rules
 */

import type {
  ValuationResult,
  NAVObservation,
  FallbackState,
} from './types';
import type { ValuationPolicy } from './types';
import type { ApprovedReserveAsset } from '../phase2/types';
import { computeConfidenceScore, isFreshnessStale } from './valuationConfidence';

function clampBps(bps: number): number {
  return Math.max(0, Math.min(10_000, Math.round(bps)));
}

export function getValuation(
  asset: ApprovedReserveAsset,
  policy: ValuationPolicy,
  nav: NAVObservation,
  fallbackState: FallbackState = 'PRIMARY_HEALTHY',
): ValuationResult {
  const baseHaircutBps = clampBps(asset.haircutPolicy.haircutBps);

  // ── Determine exclusion conditions ──────────────────────────────────────
  const isPlanned    = asset.status === 'PLANNED';
  const isInternal   = asset.status === 'INTERNAL_ONLY';
  const isOpTreasury = asset.sleeve === 'OPERATOR_TREASURY';
  const isDisabled   = asset.status === 'DISABLED' || asset.status === 'DEPRECATED';
  const isEmergency  = asset.haircutPolicy.emergencyDisabled;

  const isStaleValuation = isFreshnessStale(nav.freshnessState);
  const isFallback = nav.isFallback || fallbackState === 'USING_FALLBACK' ||
                     fallbackState === 'BOTH_STALE' || fallbackState === 'BOTH_FAILED';
  const isManualReview = nav.isManuallyReviewed || asset.haircutPolicy.manualReviewRequired;

  // Prefer live attestation status from oracle observation over static registry field.
  // This ensures live BitGo on-chain results (not stale registry metadata) gate eligibility.
  const attestationStatus = nav.liveAttestationStatus ?? asset.custody.attestationStatus;
  const hasAttestation = attestationStatus === 'CURRENT';
  const attestationMissing = policy.attestationRequired &&
    (attestationStatus === 'NONE' || attestationStatus === 'FAILED' || attestationStatus === 'STALE');

  // ── Confidence score ──────────────────────────────────────────────────────
  const confidenceScore = computeConfidenceScore({
    sourceType: nav.sourceType,
    freshnessState: nav.freshnessState,
    attestationStatus,
    reconciliationStatus: asset.custody.reconciliationStatus,
    isFallback,
    isManuallyReviewed: nav.isManuallyReviewed,
    isAssetLive: asset.isLive,
    attestationRequired: policy.attestationRequired,
  });

  // ── Compute effective haircut with expansions ──────────────────────────────
  let effectiveHaircutBps = baseHaircutBps;

  if (isStaleValuation) {
    effectiveHaircutBps = clampBps(effectiveHaircutBps + policy.haircutExpansionOnStaleBps);
  }
  if (isFallback) {
    effectiveHaircutBps = clampBps(effectiveHaircutBps + policy.haircutExpansionOnFallbackBps);
  }
  if (isEmergency) {
    effectiveHaircutBps = 10_000; // Emergency = full exclusion
  }

  // ── Gross value calculation ────────────────────────────────────────────────
  const navPerToken = nav.grossNavPerToken;
  const balance = asset.currentBalance;
  const grossValueUsd =
    navPerToken !== null && balance !== null ? navPerToken * balance : null;

  // ── Eligibility decision tree ──────────────────────────────────────────────
  let exclusionReason: string | null = null;
  let eligibleReserveValueUsd = 0;

  if (isPlanned) {
    exclusionReason = 'PLANNED_ASSET';
  } else if (isInternal) {
    exclusionReason = 'INTERNAL_ONLY_ASSET';
  } else if (isOpTreasury) {
    exclusionReason = 'OPERATOR_TREASURY_EXCLUDED';
  } else if (isDisabled) {
    exclusionReason = 'ASSET_DISABLED_OR_DEPRECATED';
  } else if (isEmergency) {
    exclusionReason = 'EMERGENCY_DISABLED';
  } else if (asset.admissionGateOpen === false) {
    // Explicit admission gate — blocks TOKENIZED_TBILL/TREASURY_FUND/GOV_MMF until
    // Phase 1 compliance gaps are resolved in code (not just in comments):
    //   LendingPlatformModule whitelist, CountryAllowModule country-0, TransferLimitModule tier-3.
    // This gate fires even if status=LIVE, preventing premature admission.
    exclusionReason = 'ADMISSION_GATE_CLOSED_PHASE1_COMPLIANCE';
  } else if (!asset.isLive) {
    exclusionReason = 'ASSET_NOT_LIVE';
  } else if (!nav.isUsable && nav.grossNavPerToken === null) {
    exclusionReason = 'VALUATION_UNUSABLE';
  } else if (isStaleValuation && !policy.eligibleWhenStale) {
    exclusionReason = 'STALE_VALUATION';
  } else if (isFallback && !policy.eligibleWhenFallback) {
    exclusionReason = 'FALLBACK_VALUATION_NOT_ELIGIBLE';
  } else if (attestationMissing && !policy.eligibleWhenAttestationMissing) {
    exclusionReason = 'ATTESTATION_REQUIRED';
  } else if (isManualReview && asset.haircutPolicy.manualReviewRequired) {
    exclusionReason = 'MANUAL_REVIEW_REQUIRED';
  } else if (grossValueUsd !== null && grossValueUsd > 0) {
    // All gates passed — compute eligible value
    eligibleReserveValueUsd = grossValueUsd * (1 - effectiveHaircutBps / 10_000);
    if (eligibleReserveValueUsd < 0) eligibleReserveValueUsd = 0;
  }

  return {
    assetId: asset.id,
    symbol: asset.assetSymbol,
    grossValueUsd,
    baseHaircutBps,
    effectiveHaircutBps,
    eligibleReserveValueUsd,
    source: nav.sourceType,
    valuationTimestamp: nav.isUsable ? nav.timestamp : null,
    freshnessState: nav.freshnessState,
    fallbackState,
    attestationStatus,
    reconciliationStatus: asset.custody.reconciliationStatus,
    isStale: isStaleValuation,
    isFallback,
    isManuallyReviewed: isManualReview,
    isEligible: eligibleReserveValueUsd > 0,
    exclusionReason,
    confidenceScore,
  };
}
