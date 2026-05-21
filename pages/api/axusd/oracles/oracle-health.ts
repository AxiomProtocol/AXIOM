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

      if (assetIds.length === 0) {
        return {
          sourceId: source.id,
          sourceName: source.name,
          sourceType: source.type,
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

  return res.status(200).json({
    fetchedAt,
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
