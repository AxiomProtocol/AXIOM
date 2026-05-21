/**
 * GET /api/axusd/oracles/asset-valuation
 *
 * Returns the full ValuationResult per asset across all registry assets.
 * Each result includes: gross value, effective haircut, eligible value,
 * source, confidence, freshness, fallback state, exclusion reason.
 *
 * No response may imply T-Bill or Treasury backing is live.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getReserveManagerSummary } from '../../../../lib/reserves/phase2/reserveManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const summary = await getReserveManagerSummary();

    return res.status(200).json({
      fetchedAt: summary.fetchedAt,
      meta: {
        sourceType: 'ASSET_VALUATION_RESULTS',
        isFallback: summary.fallbackValuedAmountUsd > 0,
        isFresh: summary.staleValueUsd === 0,
        isStale: summary.staleValueUsd > 0,
        plannedAssetsNote:
          'PLANNED assets (thBILL, BUIDL, USDY, PAXG) have valuation data but ' +
          'their eligibleReserveValueUsd is always 0. They do not count as AXUSD backing.',
      },
      valuationResults: summary.valuationResults,
      summary: {
        totalEligibleValueUsd: summary.eligibleReserveValueUsd,
        staleValueUsd: summary.staleValueUsd,
        manualReviewValueUsd: summary.manualReviewValueUsd,
        fallbackValuedAmountUsd: summary.fallbackValuedAmountUsd,
        plannedGrossValueUsd: summary.plannedGrossValueUsd,
      },
      counts: {
        total: summary.valuationResults.length,
        eligible: summary.valuationResults.filter(r => r.isEligible).length,
        excluded: summary.valuationResults.filter(r => !r.isEligible).length,
        stale: summary.valuationResults.filter(r => r.isStale).length,
        fallback: summary.valuationResults.filter(r => r.isFallback).length,
        manualReview: summary.valuationResults.filter(r => r.isManuallyReviewed).length,
      },
    });
  } catch (err) {
    console.error('[oracles/asset-valuation] error:', err);
    return res.status(500).json({
      error: 'Failed to load asset valuation results',
      fetchedAt: new Date().toISOString(),
    });
  }
}
