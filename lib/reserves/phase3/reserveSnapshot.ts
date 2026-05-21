/**
 * lib/reserves/phase3/reserveSnapshot.ts
 *
 * Phase 3 — Reserve Snapshot with valuation metadata.
 *
 * Produces per-asset snapshot rows bucketed into:
 *   liveReserveAssets      — LIVE, eligible, fresh
 *   plannedAssets          — PLANNED, valuation-only, zero eligible
 *   excludedOperatorAssets — OPERATOR_TREASURY, excluded
 *   staleAssets            — LIVE but stale, excluded or expanded haircut
 *   manualReviewAssets     — Requires human review
 *   attestationPendingAssets — Missing required attestation
 */

import type { ReserveSnapshot, ReserveSnapshotAsset, SnapshotBucket } from './types';
import type { ValuationResult } from './types';
import type { ApprovedReserveAsset } from '../phase2/types';

function determineBucket(
  asset: ApprovedReserveAsset,
  result: ValuationResult,
): SnapshotBucket {
  if (asset.haircutPolicy.emergencyDisabled) return 'EMERGENCY_DISABLED';
  if (asset.status === 'PLANNED') return 'PLANNED';
  if (asset.sleeve === 'OPERATOR_TREASURY') return 'EXCLUDED_OPERATOR';
  if (asset.status === 'INTERNAL_ONLY') return 'EXCLUDED_OPERATOR';
  if (asset.haircutPolicy.manualReviewRequired || result.isManuallyReviewed) return 'MANUAL_REVIEW';
  if (result.exclusionReason === 'ATTESTATION_REQUIRED') return 'ATTESTATION_PENDING';
  if (result.isStale) return 'STALE';
  if (result.isEligible) return 'LIVE_RESERVE';
  // Default for live assets with no specific exclusion → stale or excluded
  if (asset.isLive) return 'STALE';
  return 'EXCLUDED_OPERATOR';
}

export function buildSnapshotAsset(
  asset: ApprovedReserveAsset,
  result: ValuationResult,
): ReserveSnapshotAsset {
  const bucket = determineBucket(asset, result);

  return {
    assetId: asset.id,
    symbol: asset.assetSymbol,
    sleeve: asset.sleeve,
    status: asset.status,
    bucket,
    grossBalance: asset.currentBalance,
    grossValueUsd: result.grossValueUsd,
    eligibleValueUsd: result.eligibleReserveValueUsd,
    valuationSource: result.source,
    valuationTimestamp: result.valuationTimestamp,
    confidenceScore: result.confidenceScore,
    freshnessState: result.freshnessState,
    fallbackState: result.fallbackState,
    isStale: result.isStale,
    isFallback: result.isFallback,
    hasAttestation: asset.custody.attestationStatus === 'CURRENT',
    isManualReview: result.isManuallyReviewed,
    exclusionReason: result.exclusionReason,
    baseHaircutBps: result.baseHaircutBps,
    effectiveHaircutBps: result.effectiveHaircutBps,
  };
}

export function assembleReserveSnapshot(
  assets: ApprovedReserveAsset[],
  results: ValuationResult[],
): ReserveSnapshot {
  const fetchedAt = new Date().toISOString();
  const warnings: string[] = [];

  const resultMap = new Map(results.map(r => [r.assetId, r]));

  const snapshotAssets: ReserveSnapshotAsset[] = assets.map(asset => {
    const result = resultMap.get(asset.id);
    if (!result) {
      // Synthesize a zero result if somehow missing
      const fallback: ValuationResult = {
        assetId: asset.id,
        symbol: asset.assetSymbol,
        grossValueUsd: null,
        baseHaircutBps: asset.haircutPolicy.haircutBps,
        effectiveHaircutBps: asset.haircutPolicy.haircutBps,
        eligibleReserveValueUsd: 0,
        source: 'INTERNAL_ACCOUNTING',
        valuationTimestamp: null,
        freshnessState: 'UNUSABLE',
        fallbackState: 'BOTH_FAILED',
        attestationStatus: asset.custody.attestationStatus,
        reconciliationStatus: asset.custody.reconciliationStatus,
        isStale: true,
        isFallback: false,
        isManuallyReviewed: false,
        isEligible: false,
        exclusionReason: 'NO_VALUATION_RESULT',
        confidenceScore: 0,
      };
      return buildSnapshotAsset(asset, fallback);
    }
    return buildSnapshotAsset(asset, result);
  });

  // Bucket
  const liveReserveAssets      = snapshotAssets.filter(a => a.bucket === 'LIVE_RESERVE');
  const plannedAssets           = snapshotAssets.filter(a => a.bucket === 'PLANNED');
  const excludedOperatorAssets  = snapshotAssets.filter(a => a.bucket === 'EXCLUDED_OPERATOR' || a.bucket === 'EMERGENCY_DISABLED');
  const staleAssets             = snapshotAssets.filter(a => a.bucket === 'STALE');
  const manualReviewAssets      = snapshotAssets.filter(a => a.bucket === 'MANUAL_REVIEW');
  const attestationPendingAssets = snapshotAssets.filter(a => a.bucket === 'ATTESTATION_PENDING');

  // Totals
  const totalEligibleValueUsd = liveReserveAssets.reduce((s, a) => s + a.eligibleValueUsd, 0);
  const totalGrossValueUsd = snapshotAssets.reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);
  const staleValueUsd = staleAssets.reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);
  const manualReviewValueUsd = manualReviewAssets.reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);
  const fallbackValuedAmountUsd = snapshotAssets
    .filter(a => a.isFallback)
    .reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);
  const plannedGrossValueUsd = plannedAssets.reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);

  // Invariant warnings
  if (plannedGrossValueUsd > 0) {
    warnings.push(
      `PLANNED assets have gross value $${plannedGrossValueUsd.toFixed(2)} — ` +
      'correctly excluded from eligible reserve value.'
    );
  }
  if (staleValueUsd > 0) {
    warnings.push(
      `$${staleValueUsd.toFixed(2)} in stale-valuation assets excluded from eligible reserves.`
    );
  }
  if (manualReviewValueUsd > 0) {
    warnings.push(
      `$${manualReviewValueUsd.toFixed(2)} in assets pending manual review — excluded.`
    );
  }

  return {
    fetchedAt,
    liveReserveAssets,
    plannedAssets,
    excludedOperatorAssets,
    staleAssets,
    manualReviewAssets,
    attestationPendingAssets,
    totalEligibleValueUsd,
    totalGrossValueUsd,
    staleValueUsd,
    manualReviewValueUsd,
    fallbackValuedAmountUsd,
    plannedGrossValueUsd,
    warnings,
  };
}
