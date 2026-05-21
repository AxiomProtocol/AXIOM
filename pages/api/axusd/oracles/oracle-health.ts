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
import { SOURCE_BASE_SCORES } from '../../../../lib/reserves/phase3/valuationConfidence';

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

  // ── Confidence score and freshness — single source of truth ──────────────
  // Mirrors the computation previously duplicated in ReserveHealthBadge.tsx.
  // The badge now reads these values directly from the response.
  const meta = {
    isFresh: true,
    isStale: false,
  };

  const activeSources = healthChecks.filter(h => h.isActive && !h.isDeprecated);
  const healthyActive = activeSources.filter(h => h.isHealthy);
  let confidenceScore = 0;
  if (activeSources.length > 0 && healthyActive.length > 0) {
    const avgBase = healthyActive.reduce((sum, h) => sum + h.baseScore, 0) / healthyActive.length;
    const coverageRatio = healthyActive.length / activeSources.length;
    const weighted = avgBase * coverageRatio;
    const penalized = meta.isStale ? weighted - 25 : !meta.isFresh ? weighted - 5 : weighted;
    confidenceScore = Math.max(0, Math.min(100, Math.round(penalized)));
  }

  const freshnessState: 'FRESH' | 'APPROACHING STALE' | 'STALE' =
    meta.isStale ? 'STALE' : !meta.isFresh ? 'APPROACHING STALE' : 'FRESH';

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
