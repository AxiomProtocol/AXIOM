/**
 * GET /api/axusd/reserve-manager/snapshots
 *
 * Reserve snapshot output with full valuation metadata per asset.
 * Assets bucketed into: liveReserve, planned, excludedOperator,
 * stale, manualReview, attestationPending.
 *
 * Phase 3 endpoint. All responses clearly distinguish
 * live vs planned vs excluded vs valuation-only tiers.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getReserveSnapshotPhase3 } from '../../../../lib/reserves/phase2/reserveManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const snapshot = await getReserveSnapshotPhase3();

    return res.status(200).json({
      fetchedAt: snapshot.fetchedAt,
      meta: {
        sourceType: 'RESERVE_SNAPSHOT',
        isFallback: snapshot.fallbackValuedAmountUsd > 0,
        isFresh: snapshot.staleValueUsd === 0,
        isStale: snapshot.staleValueUsd > 0,
        plannedAssetsNote:
          'plannedAssets bucket contains assets with oracle data but zero eligible value. ' +
          'No T-Bill or Treasury backing is currently live as AXUSD reserves.',
      },
      totals: {
        totalEligibleValueUsd:   snapshot.totalEligibleValueUsd,
        totalGrossValueUsd:      snapshot.totalGrossValueUsd,
        staleValueUsd:           snapshot.staleValueUsd,
        manualReviewValueUsd:    snapshot.manualReviewValueUsd,
        fallbackValuedAmountUsd: snapshot.fallbackValuedAmountUsd,
        plannedGrossValueUsd:    snapshot.plannedGrossValueUsd,
      },
      counts: {
        liveReserve:        snapshot.liveReserveAssets.length,
        planned:            snapshot.plannedAssets.length,
        excludedOperator:   snapshot.excludedOperatorAssets.length,
        stale:              snapshot.staleAssets.length,
        manualReview:       snapshot.manualReviewAssets.length,
        attestationPending: snapshot.attestationPendingAssets.length,
      },
      buckets: {
        liveReserveAssets:       snapshot.liveReserveAssets,
        plannedAssets:           snapshot.plannedAssets,
        excludedOperatorAssets:  snapshot.excludedOperatorAssets,
        staleAssets:             snapshot.staleAssets,
        manualReviewAssets:      snapshot.manualReviewAssets,
        attestationPendingAssets: snapshot.attestationPendingAssets,
      },
      warnings: snapshot.warnings,
    });
  } catch (err) {
    console.error('[reserve-manager/snapshots] error:', err);
    return res.status(500).json({
      error: 'Failed to load reserve snapshot',
      fetchedAt: new Date().toISOString(),
    });
  }
}
