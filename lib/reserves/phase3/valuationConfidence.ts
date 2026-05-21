/**
 * lib/reserves/phase3/valuationConfidence.ts
 *
 * Phase 3 — Stale data state machine and confidence scoring model.
 *
 * Confidence scores range 0–100 (integer, clamped).
 * A lower score means less reliable valuation data.
 */

import type { ValuationFreshnessState, OracleSourceType, ConfidenceScoreParams } from './types';

// ── Base confidence scores by source type ─────────────────────────────────────

export const SOURCE_BASE_SCORES: Record<OracleSourceType, number> = {
  FIXED_PEG:                  99,
  CHAINLINK:                  92,
  ERC4626_CONVERT_TO_ASSETS:  85,
  ISSUER_NAV_API:             80,
  CUSTODIAN_ATTESTATION:      75,
  MANUAL_OPERATOR_INPUT:      50,
  DEX_TWAP:                   40,
  INTERNAL_ACCOUNTING:        60,
  FALLBACK_COMPOSITE:         65,
};

// ── Freshness state penalties ─────────────────────────────────────────────────

const FRESHNESS_PENALTIES: Record<ValuationFreshnessState, number> = {
  FRESH:                  0,
  APPROACHING_STALE:     -5,
  STALE:                -25,
  EXPIRED:              -40,
  MANUAL_REVIEW_REQUIRED: -15,
  UNUSABLE:             -100,
};

// ── Compute freshness state ───────────────────────────────────────────────────

/**
 * Computes the freshness state given a last-updated timestamp and
 * the maximum staleness threshold in seconds.
 *
 * Approaching stale = within 80%–100% of maxStalenessSeconds.
 * Stale = 100%–200% of maxStalenessSeconds.
 * Expired = >200% of maxStalenessSeconds.
 */
export function computeFreshnessState(
  lastUpdatedAt: string | null,
  maxStalenessSeconds: number,
): ValuationFreshnessState {
  if (!lastUpdatedAt) return 'UNUSABLE';

  const now = Date.now();
  const lastUpdated = new Date(lastUpdatedAt).getTime();

  if (isNaN(lastUpdated)) return 'UNUSABLE';

  const ageSeconds = (now - lastUpdated) / 1000;

  if (ageSeconds < 0) return 'FRESH'; // Clock skew — treat as fresh

  if (ageSeconds <= maxStalenessSeconds * 0.8) return 'FRESH';
  if (ageSeconds <= maxStalenessSeconds) return 'APPROACHING_STALE';
  if (ageSeconds <= maxStalenessSeconds * 2) return 'STALE';
  if (ageSeconds <= maxStalenessSeconds * 4) return 'EXPIRED';
  return 'MANUAL_REVIEW_REQUIRED';
}

export function isFreshnessUnusable(state: ValuationFreshnessState): boolean {
  return state === 'UNUSABLE' || state === 'MANUAL_REVIEW_REQUIRED';
}

export function isFreshnessStale(state: ValuationFreshnessState): boolean {
  return state === 'STALE' || state === 'EXPIRED' || state === 'MANUAL_REVIEW_REQUIRED' || state === 'UNUSABLE';
}

// ── Compute confidence score ──────────────────────────────────────────────────

/**
 * Computes a confidence score in [0, 100] for a given valuation observation.
 *
 * Penalties are applied additively. Score is clamped to [0, 100].
 */
export function computeConfidenceScore(params: ConfidenceScoreParams): number {
  const {
    sourceType,
    freshnessState,
    attestationStatus,
    reconciliationStatus,
    isFallback,
    isManuallyReviewed,
    isAssetLive,
    attestationRequired,
  } = params;

  let score = SOURCE_BASE_SCORES[sourceType] ?? 50;

  // Freshness penalty
  score += FRESHNESS_PENALTIES[freshnessState] ?? 0;

  // Attestation penalties
  if (attestationStatus === 'STALE') {
    score -= 15;
  } else if (attestationStatus === 'FAILED') {
    score -= 30;
  } else if (attestationStatus === 'MANUAL_REVIEW') {
    score -= 10;
  } else if (attestationStatus === 'NONE' && attestationRequired) {
    score -= 20;
  } else if (attestationStatus === 'PENDING') {
    score -= 5;
  }

  // Reconciliation penalty
  if (reconciliationStatus === 'OVERDUE') {
    score -= 10;
  } else if (reconciliationStatus === 'FAILED') {
    score -= 20;
  }

  // Fallback usage penalty
  if (isFallback) {
    score -= 10;
  }

  // Manual review penalty
  if (isManuallyReviewed) {
    score -= 5;
  }

  // Asset not live penalty (PLANNED/INTERNAL/DISABLED)
  if (!isAssetLive) {
    score -= 10;
  }

  // Clamp to [0, 100]
  return Math.max(0, Math.min(100, Math.round(score)));
}
