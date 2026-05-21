/**
 * GET /api/axusd/oracles/oracle-health
 *
 * Health check across all oracle sources.
 * Shows: last successful call, last failure, isHealthy, latencyMs, source type.
 *
 * In Phase 3, most sources are stubs (isActive=false).
 * This endpoint returns the current stub health state.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getOracleSourceRegistry } from '../../../../lib/reserves/phase3/oracleSourceRegistry';
import { getTreasuryNAVOracle } from '../../../../lib/reserves/phase3/treasuryNAVOracle';
import { getApprovedReserveAssetRegistry } from '../../../../lib/reserves/phase2/approvedReserveAssetRegistry';
import {
  SOURCE_BASE_SCORES,
  computeConfidenceScore,
  computeFreshnessState,
} from '../../../../lib/reserves/phase3/valuationConfidence';
import type { OracleSourceType } from '../../../../lib/reserves/phase3/types';

// ── Freshness state → badge label mapping ─────────────────────────────────────
// ValuationFreshnessState has six states; the badge-facing API contract collapses
// them to three for display clarity. The mapping keeps the computation in one place.
type BadgeFreshnessLabel = 'FRESH' | 'APPROACHING STALE' | 'STALE';

function toBadgeFreshnessLabel(state: ReturnType<typeof computeFreshnessState>): BadgeFreshnessLabel {
  if (state === 'FRESH') return 'FRESH';
  if (state === 'APPROACHING_STALE') return 'APPROACHING STALE';
  return 'STALE';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const fetchedAt = new Date().toISOString();
  const sources = getOracleSourceRegistry();
  const oracle = getTreasuryNAVOracle();
  const registry = getApprovedReserveAssetRegistry();

  // Check each source by probing its known assets
  const healthChecks = await Promise.all(
    sources.map(async source => {
      const assetIds = source.supportedAssets.includes('*')
        ? []
        : source.supportedAssets.filter(id => registry.some(a => a.id === id));

      const baseScore = (SOURCE_BASE_SCORES as Record<string, number>)[source.type] ?? 60;

      if (assetIds.length === 0) {
        return {
          sourceId: source.id,
          sourceName: source.name,
          sourceType: source.type,
          baseScore,
          isActive: source.isActive,
          isDeprecated: source.isDeprecated,
          isHealthy: source.isActive && !source.isDeprecated,
          latencyMs: null,
          lastSuccessAt: source.isActive ? fetchedAt : null,
          lastFailureAt: null,
          statusNote: source.isActive
            ? 'Active — no specific asset to probe'
            : source.isDeprecated
              ? 'Deprecated'
              : 'Stub — not yet connected (Phase 3 integration pending)',
        };
      }

      const start = Date.now();
      try {
        const obs = await oracle.getNAVWithMetadata(assetIds[0]);
        const latencyMs = Date.now() - start;
        return {
          sourceId: source.id,
          sourceName: source.name,
          sourceType: source.type,
          baseScore,
          isActive: source.isActive,
          isDeprecated: source.isDeprecated,
          isHealthy: obs.isUsable,
          latencyMs,
          lastSuccessAt: obs.isUsable ? fetchedAt : null,
          lastFailureAt: obs.isUsable ? null : fetchedAt,
          statusNote: obs.isUsable
            ? `Healthy — ${obs.sourceName}`
            : obs.unusableReason ?? 'Unavailable',
        };
      } catch {
        return {
          sourceId: source.id,
          sourceName: source.name,
          sourceType: source.type,
          baseScore,
          isActive: source.isActive,
          isDeprecated: source.isDeprecated,
          isHealthy: false,
          latencyMs: Date.now() - start,
          lastSuccessAt: null,
          lastFailureAt: fetchedAt,
          statusNote: 'Error during health probe',
        };
      }
    })
  );

  const healthySources = healthChecks.filter(h => h.isHealthy).length;
  const totalActive = sources.filter(s => s.isActive && !s.isDeprecated).length;

  // ── Confidence score and freshness — computed via valuationConfidence.ts ─────
  // freshnessState: derived from the endpoint's own fetchedAt timestamp using the
  // shared computeFreshnessState function (max staleness = 300s for a live probe).
  // confidenceScore: weighted average of per-source computeConfidenceScore calls,
  // scaled by coverage ratio (healthy / total active).
  const MAX_HEALTH_STALENESS_SECONDS = 300;

  const endpointFreshnessRaw = computeFreshnessState(fetchedAt, MAX_HEALTH_STALENESS_SECONDS);
  const freshnessState: BadgeFreshnessLabel = toBadgeFreshnessLabel(endpointFreshnessRaw);

  const activeSources = healthChecks.filter(h => h.isActive && !h.isDeprecated);
  const healthyActive = activeSources.filter(h => h.isHealthy);
  let confidenceScore = 0;
  if (activeSources.length > 0 && healthyActive.length > 0) {
    const sumScores = healthyActive.reduce((sum, h) => {
      const sourceFreshnessRaw = computeFreshnessState(
        h.lastSuccessAt,
        MAX_HEALTH_STALENESS_SECONDS,
      );
      return sum + computeConfidenceScore({
        sourceType: h.sourceType as OracleSourceType,
        freshnessState: sourceFreshnessRaw,
        attestationStatus: 'NONE',
        reconciliationStatus: 'NOT_REQUIRED',
        isFallback: false,
        isManuallyReviewed: false,
        isAssetLive: true,
        attestationRequired: false,
      });
    }, 0);
    const avgScore = sumScores / healthyActive.length;
    const coverageRatio = healthyActive.length / activeSources.length;
    confidenceScore = Math.max(0, Math.min(100, Math.round(avgScore * coverageRatio)));
  }

  return res.status(200).json({
    fetchedAt,
    confidenceScore,
    freshnessState,
    meta: {
      sourceType: 'ORACLE_HEALTH_CHECK',
      isFallback: false,
      isFresh: true,
      isStale: false,
      plannedAssetsNote:
        'Most oracle sources are Phase 3 stubs not yet connected. ' +
        'USDC fixed peg is always healthy. No T-Bill or Treasury backing is currently live.',
    },
    overallHealth: {
      isHealthy: healthySources === totalActive,
      healthySources,
      totalActiveSources: totalActive,
      degradedSources: totalActive - healthySources,
    },
    sources: healthChecks,
  });
}
