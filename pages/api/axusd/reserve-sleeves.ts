/**
 * pages/api/axusd/reserve-sleeves.ts
 *
 * GET /api/axusd/reserve-sleeves
 *
 * Returns the reserve sleeve aggregates — one entry per sleeve with:
 *   - sleeve metadata (name, description, eligibility for AXUSD backing)
 *   - asset counts (live, planned, excluded)
 *   - gross USD value (LIVE assets only)
 *   - eligible reserve value after haircuts (LIVE, non-OPERATOR_TREASURY only)
 *   - public disclosure labels and caution language
 *
 * Invariant enforced: PLANNED sleeve values are reported separately and
 * never included in the eligible reserve total.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getReserveManagerSummary } from '../../../lib/reserves/phase2/reserveManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const summary = await getReserveManagerSummary();

    // For public callers, omit INTERNAL sleeve assets
    const publicSleeves = summary.sleeves.map(s => ({
      sleeve:                     s.sleeve,
      sleeveName:                 s.sleeveName,
      sleeveDescription:          s.sleeveDescription,
      isEligibleForAxusdBacking:  s.isEligibleForAxusdBacking,
      grossValueUsd:              s.grossValueUsd,
      eligibleReserveValueUsd:    s.eligibleReserveValueUsd,
      liveAssetCount:             s.liveAssetCount,
      plannedAssetCount:          s.plannedAssetCount,
      excludedAssetCount:         s.excludedAssetCount,
      publicLabel:                s.publicLabel,
      disclosureCaution:          s.disclosureCaution,
    }));

    return res.status(200).json({
      fetchedAt:                  summary.fetchedAt,
      totalEligibleReserveUsd:   summary.eligibleReserveValueUsd,
      canonicalPsmReserveUsd:    summary.canonicalPsmReserveUsd,
      plannedGrossValueUsd:      summary.plannedGrossValueUsd,
      operatorTreasuryValueUsd:  summary.operatorTreasuryValueUsd,
      sleeves:                   publicSleeves,
      warnings:                  summary.warnings,
      disclosureNote:
        'Only LIVE assets in AXUSD-eligible sleeves count toward reserve coverage. ' +
        'PLANNED, OPERATOR_TREASURY, DISABLED, and INTERNAL_ONLY assets are excluded. ' +
        'Tokenized Treasury backing is planned infrastructure — not currently active.',
    });
  } catch (err) {
    console.error('[reserve-sleeves] error:', err);
    return res.status(500).json({
      error:      'Failed to load reserve sleeve data',
      fetchedAt:  new Date().toISOString(),
    });
  }
}
