/**
 * GET /api/axusd/reserve-manager/valuation-summary
 *
 * Extended ReserveManagerSummary including Phase 3 valuation buckets:
 *   - stale / fallback / manual-review breakdown
 *   - per-asset valuation results
 *   - haircutAdjustedReserveValueUsd
 *
 * Extends the existing /api/axusd/reserve-manager/summary endpoint.
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
        sourceType: 'RESERVE_VALUATION_SUMMARY',
        isFallback: summary.fallbackValuedAmountUsd > 0,
        isFresh: summary.staleValueUsd === 0,
        isStale: summary.staleValueUsd > 0,
        plannedAssetsNote:
          'plannedGrossValueUsd reflects PLANNED assets. ' +
          'These do not count toward AXUSD reserve backing.',
      },
      totals: {
        totalGrossValueUsd:              summary.totalGrossValueUsd,
        liveGrossValueUsd:               summary.liveGrossValueUsd,
        eligibleReserveValueUsd:         summary.eligibleReserveValueUsd,
        haircutAdjustedReserveValueUsd:  summary.haircutAdjustedReserveValueUsd,
        canonicalPsmReserveUsd:          summary.canonicalPsmReserveUsd,
        plannedGrossValueUsd:            summary.plannedGrossValueUsd,
        operatorTreasuryValueUsd:        summary.operatorTreasuryValueUsd,
        excludedValueUsd:                summary.excludedValueUsd,
        // Phase 3 additions
        staleValueUsd:                   summary.staleValueUsd,
        manualReviewValueUsd:            summary.manualReviewValueUsd,
        fallbackValuedAmountUsd:         summary.fallbackValuedAmountUsd,
      },
      counts: {
        total:        summary.totalAssetCount,
        live:         summary.liveAssetCount,
        planned:      summary.plannedAssetCount,
        excluded:     summary.excludedAssetCount,
        internalOnly: summary.internalOnlyAssetCount,
        stale:        summary.valuationResults.filter(r => r.isStale).length,
        fallback:     summary.valuationResults.filter(r => r.isFallback).length,
        manualReview: summary.valuationResults.filter(r => r.isManuallyReviewed).length,
      },
      sleeves: summary.sleeves.map(s => ({
        sleeve:                    s.sleeve,
        sleeveName:                s.sleeveName,
        isEligibleForAxusdBacking: s.isEligibleForAxusdBacking,
        grossValueUsd:             s.grossValueUsd,
        eligibleReserveValueUsd:   s.eligibleReserveValueUsd,
        liveAssetCount:            s.liveAssetCount,
        plannedAssetCount:         s.plannedAssetCount,
        excludedAssetCount:        s.excludedAssetCount,
        disclosureCaution:         s.disclosureCaution,
      })),
      valuationResults: summary.valuationResults,
      coverageInputs:   summary.coverageInputs,
      methodology:      summary.methodology,
      warnings:         summary.warnings,
      separation: {
        canonicalPsm:        'CanonicalPSM — live USDC mint/redeem backing.',
        reserveManager:      'ReserveManager — reserve accounting and asset eligibility layer (Phase 2/3).',
        axiomTreasuryVault:  'AxiomTreasuryVault — internal operator capital. Not counted as AXUSD backing.',
      },
    });
  } catch (err) {
    console.error('[reserve-manager/valuation-summary] error:', err);
    return res.status(500).json({
      error: 'Failed to load valuation summary',
      fetchedAt: new Date().toISOString(),
    });
  }
}
