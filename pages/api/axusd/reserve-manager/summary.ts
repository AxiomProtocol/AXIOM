/**
 * pages/api/axusd/reserve-manager/summary.ts
 *
 * GET /api/axusd/reserve-manager/summary
 *
 * Returns the full ReserveManagerSummary — aggregate view across all
 * reserve sleeves with gross value, eligible reserve value, planned value,
 * operator treasury value, sleeve breakdowns, and methodology.
 *
 * Key guarantee: plannedGrossValueUsd is never added to eligibleReserveValueUsd.
 * Operator treasury assets are reported separately and excluded from backing.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getReserveManagerSummary } from '../../../../lib/reserves/phase2/reserveManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const summary = await getReserveManagerSummary();

    return res.status(200).json({
      fetchedAt:                summary.fetchedAt,
      totals: {
        totalGrossValueUsd:         summary.totalGrossValueUsd,
        liveGrossValueUsd:          summary.liveGrossValueUsd,
        eligibleReserveValueUsd:    summary.eligibleReserveValueUsd,
        canonicalPsmReserveUsd:     summary.canonicalPsmReserveUsd,
        plannedGrossValueUsd:       summary.plannedGrossValueUsd,
        operatorTreasuryValueUsd:   summary.operatorTreasuryValueUsd,
        excludedValueUsd:           summary.excludedValueUsd,
      },
      counts: {
        total:          summary.totalAssetCount,
        live:           summary.liveAssetCount,
        planned:        summary.plannedAssetCount,
        excluded:       summary.excludedAssetCount,
        internalOnly:   summary.internalOnlyAssetCount,
      },
      sleeves:          summary.sleeves.map(s => ({
        sleeve:                     s.sleeve,
        sleeveName:                 s.sleeveName,
        isEligibleForAxusdBacking:  s.isEligibleForAxusdBacking,
        grossValueUsd:              s.grossValueUsd,
        eligibleReserveValueUsd:    s.eligibleReserveValueUsd,
        liveAssetCount:             s.liveAssetCount,
        plannedAssetCount:          s.plannedAssetCount,
        excludedAssetCount:         s.excludedAssetCount,
        disclosureCaution:          s.disclosureCaution,
      })),
      coverageInputs:   summary.coverageInputs,
      methodology:      summary.methodology,
      warnings:         summary.warnings,
      separation: {
        canonicalPsm:
          'CanonicalPSM — live USDC mint/redeem backing. Source of truth for AXUSD supply.',
        reserveManager:
          'ReserveManager — reserve accounting and asset eligibility layer (Phase 2).',
        axiomTreasuryVault:
          'AxiomTreasuryVault — internal operator capital management. ' +
          'Not counted as AXUSD backing.',
      },
    });
  } catch (err) {
    console.error('[reserve-manager/summary] error:', err);
    return res.status(500).json({
      error:     'Failed to load reserve manager summary',
      fetchedAt: new Date().toISOString(),
    });
  }
}
