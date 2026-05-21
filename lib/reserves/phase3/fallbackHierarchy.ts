/**
 * lib/reserves/phase3/fallbackHierarchy.ts
 *
 * Phase 3 — Fallback Hierarchy Engine
 *
 * Selects the best available valuation source given primary and fallback
 * NAVObservation inputs, applying confidence penalties and state flags.
 *
 * Decision tree:
 *   1. Primary healthy → use primary
 *   2. Primary stale, fallback healthy → use fallback with penalty
 *   3. Primary failed, fallback healthy → use fallback with penalty
 *   4. Both stale → use best available; mark UNUSABLE if below minConfidence
 *   5. Both failed → return unusable result
 *   6. Manual override present and unexpired → use with isManuallyReviewed=true
 *   7. Manual override expired → treat as failed
 */

import type { NAVObservation, FallbackState, ValuationFreshnessState } from './types';
import { computeConfidenceScore, computeFreshnessState, isFreshnessStale } from './valuationConfidence';

export interface ManualOverride {
  grossNavPerToken: number;
  confidence: number;
  setAt: string;      // ISO timestamp
  expiresAt: string;  // ISO timestamp
  operatorNote: string;
}

export interface FallbackSelectionResult {
  observation: NAVObservation;
  fallbackState: FallbackState;
  selectedSourceId: string;
  penaltyApplied: number;
}

function isOverrideExpired(override: ManualOverride): boolean {
  return Date.now() > new Date(override.expiresAt).getTime();
}

function isObservationHealthy(obs: NAVObservation): boolean {
  return obs.isUsable && !obs.isStale && obs.grossNavPerToken !== null;
}

function isObservationStaleButUsable(obs: NAVObservation): boolean {
  return obs.isUsable && obs.isStale && obs.grossNavPerToken !== null;
}

/**
 * Select the best NAVObservation from primary, fallback, and optional manual override.
 *
 * Returns a FallbackSelectionResult describing which source was used and why.
 */
export function selectValuationSource(
  primaryObs: NAVObservation,
  fallbackObs: NAVObservation | null,
  manualOverride: ManualOverride | null,
  minConfidenceScore: number,
): FallbackSelectionResult {

  // ── Case 6/7: Manual override ─────────────────────────────────────────────
  if (manualOverride) {
    if (isOverrideExpired(manualOverride)) {
      // Treat as failed — manual override expired
      const expiredObs: NAVObservation = {
        ...primaryObs,
        isUsable: false,
        unusableReason: 'Manual override has expired — operator must refresh or reconnect oracle',
        confidenceScore: 0,
        freshnessState: 'UNUSABLE',
        isStale: true,
        isManuallyReviewed: true,
      };
      return {
        observation: expiredObs,
        fallbackState: 'MANUAL_OVERRIDE_EXPIRED',
        selectedSourceId: 'MANUAL_OPERATOR_INPUT',
        penaltyApplied: 100,
      };
    }
    // Active manual override
    const overrideObs: NAVObservation = {
      ...primaryObs,
      grossNavPerToken: manualOverride.grossNavPerToken,
      sourceType: 'MANUAL_OPERATOR_INPUT',
      sourceName: 'Manual Operator Input',
      timestamp: manualOverride.setAt,
      confidenceScore: Math.max(0, Math.min(50, manualOverride.confidence)),
      freshnessState: computeFreshnessState(manualOverride.setAt, 86400),
      isManuallyReviewed: true,
      isUsable: true,
      unusableReason: null,
    };
    return {
      observation: overrideObs,
      fallbackState: 'MANUAL_OVERRIDE_ACTIVE',
      selectedSourceId: 'MANUAL_OPERATOR_INPUT',
      penaltyApplied: 5,
    };
  }

  // ── Case 1: Primary healthy ───────────────────────────────────────────────
  if (isObservationHealthy(primaryObs)) {
    return {
      observation: primaryObs,
      fallbackState: 'PRIMARY_HEALTHY',
      selectedSourceId: primaryObs.sourceType,
      penaltyApplied: 0,
    };
  }

  // ── Case 2/3: Primary stale or failed — try fallback ─────────────────────
  if (fallbackObs && isObservationHealthy(fallbackObs)) {
    const penalized: NAVObservation = {
      ...fallbackObs,
      isFallback: true,
      confidenceScore: Math.max(0, fallbackObs.confidenceScore - 10),
    };
    return {
      observation: penalized,
      fallbackState: 'USING_FALLBACK',
      selectedSourceId: fallbackObs.sourceType,
      penaltyApplied: 10,
    };
  }

  // ── Case 4: Both stale — use best available ───────────────────────────────
  const primaryStaleUsable = isObservationStaleButUsable(primaryObs);
  const fallbackStaleUsable = fallbackObs && isObservationStaleButUsable(fallbackObs);

  if (primaryStaleUsable || fallbackStaleUsable) {
    const best = (primaryStaleUsable && fallbackStaleUsable)
      ? (primaryObs.confidenceScore >= (fallbackObs?.confidenceScore ?? 0) ? primaryObs : fallbackObs!)
      : primaryStaleUsable ? primaryObs : fallbackObs!;

    const penalized: NAVObservation = {
      ...best,
      isFallback: best !== primaryObs,
      confidenceScore: Math.max(0, best.confidenceScore - 15),
      isUsable: best.confidenceScore - 15 >= minConfidenceScore,
      unusableReason:
        best.confidenceScore - 15 < minConfidenceScore
          ? `Both primary and fallback sources are stale. Confidence ${best.confidenceScore - 15} below minimum ${minConfidenceScore}.`
          : null,
    };

    return {
      observation: penalized,
      fallbackState: 'BOTH_STALE',
      selectedSourceId: best.sourceType,
      penaltyApplied: 15,
    };
  }

  // ── Case 5: Both failed ───────────────────────────────────────────────────
  const failedObs: NAVObservation = {
    ...primaryObs,
    grossNavPerToken: null,
    isUsable: false,
    isStale: true,
    confidenceScore: 0,
    freshnessState: 'UNUSABLE',
    unusableReason: 'Both primary and fallback oracle sources failed or are unavailable',
  };

  return {
    observation: failedObs,
    fallbackState: 'BOTH_FAILED',
    selectedSourceId: primaryObs.sourceType,
    penaltyApplied: 100,
  };
}
