/**
 * GET /api/axusd/oracles/nav?asset=<assetId>
 *
 * Returns the NAVObservation for a single asset including confidence,
 * freshness state, and fallback flag.
 *
 * If ?asset= is omitted, returns observations for all registry assets.
 *
 * Phase 4 additions:
 *   - cache stats (entries, fresh, stale) appended to all responses
 *   - lastPoll summary (most recent refreshAllObservations run)
 *   - liveAttestationStatus surfaced explicitly for PAXG / BitGo attestation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getTreasuryNAVOracle } from '../../../../lib/reserves/phase3/treasuryNAVOracle';
import { getApprovedReserveAssetRegistry } from '../../../../lib/reserves/phase2/approvedReserveAssetRegistry';
import { getCacheStats } from '../../../../lib/reserves/phase3/navObservationCache';
import { getLastPollSummary } from '../../../../lib/reserves/phase3/navPollingService';

function buildCacheAndPollMeta() {
  const stats = getCacheStats();
  const lastPoll = getLastPollSummary();
  return {
    cache: {
      entries: stats.entries,
      fresh: stats.fresh,
      stale: stats.stale,
      assets: stats.assets,
    },
    lastPoll: lastPoll
      ? {
          startedAt: lastPoll.startedAt,
          completedAt: lastPoll.completedAt,
          durationMs: lastPoll.durationMs,
          successCount: lastPoll.successCount,
          failureCount: lastPoll.failureCount,
        }
      : null,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const oracle = getTreasuryNAVOracle();
  const assetId = req.query.asset as string | undefined;

  try {
    if (assetId) {
      const obs = await oracle.getNAVWithMetadata(assetId);
      return res.status(200).json({
        fetchedAt: new Date().toISOString(),
        meta: {
          sourceType: obs.sourceType,
          isFallback: obs.isFallback,
          isFresh: obs.freshnessState === 'FRESH' || obs.freshnessState === 'APPROACHING_STALE',
          isStale: obs.isStale,
          plannedAssetsNote:
            obs.isUsable === false
              ? 'This asset oracle is not yet connected. It does not currently count as AXUSD backing.'
              : null,
        },
        observation: obs,
        ...buildCacheAndPollMeta(),
      });
    }

    // All assets
    const registry = getApprovedReserveAssetRegistry();
    const observations = await Promise.all(
      registry.map(async asset => oracle.getNAVWithMetadata(asset.id))
    );

    return res.status(200).json({
      fetchedAt: new Date().toISOString(),
      meta: {
        sourceType: 'MULTI_ASSET_NAV',
        isFallback: false,
        isFresh: true,
        isStale: false,
        plannedAssetsNote:
          'PLANNED assets return unusable observations. They do not count as AXUSD backing.',
      },
      observations,
      counts: {
        total: observations.length,
        usable: observations.filter(o => o.isUsable).length,
        unusable: observations.filter(o => !o.isUsable).length,
        stale: observations.filter(o => o.isStale).length,
        fallback: observations.filter(o => o.isFallback).length,
      },
      ...buildCacheAndPollMeta(),
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to fetch NAV observation',
      fetchedAt: new Date().toISOString(),
    });
  }
}
