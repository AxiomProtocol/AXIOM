/**
 * pages/api/axusd/reserve-manager/coverage.ts
 *
 * GET /api/axusd/reserve-manager/coverage
 *
 * Returns the Phase 2 reserve coverage computation:
 *   - eligibleReserveValueUsd  (LIVE assets, after haircuts, no OPERATOR_TREASURY)
 *   - axusdCirculatingSupply   (from AXUSD.totalSupply())
 *   - coverageRatio            (eligible / supply)
 *   - breakdown by sleeve (PSM, planned T-Bill, planned Treasury Fund, operator, excluded)
 *
 * Critical invariant enforced:
 *   PLANNED T-Bill or Treasury Fund assets are reported in breakdown.plannedTbillUsd
 *   and breakdown.plannedTreasuryFundUsd ONLY — they are NEVER included in
 *   eligibleReserveValueUsd or coverageRatio.
 *
 * Denominator note:
 *   Coverage ratio denominator = AXUSD.totalSupply() (circulating supply).
 *   NOT the treasury wallet balance. NOT any value from this registry.
 *   See lib/reserves/getCanonicalReserveSnapshot.ts for the canonical source.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getReserveCoverage } from '../../../../lib/reserves/phase2/reserveManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const coverage = await getReserveCoverage();

    return res.status(200).json({
      fetchedAt:                  coverage.fetchedAt,
      eligibleReserveValueUsd:    coverage.eligibleReserveValueUsd,
      axusdCirculatingSupply:     coverage.axusdCirculatingSupply,
      coverageRatio:              coverage.coverageRatio,
      coverageRatioFormatted:     coverage.coverageRatioFormatted,
      breakdown:                  coverage.breakdown,
      warnings:                   coverage.warnings,
      methodology:                coverage.methodology,
      disclaimers: [
        'plannedTbillUsd and plannedTreasuryFundUsd are shown for transparency only.',
        'These PLANNED values do not inflate the coverageRatio.',
        'operatorTreasuryUsd reflects AxiomTreasuryVault internal capital — excluded from AXUSD backing.',
        'Tokenized Treasury backing is a planned Phase 3+ objective. It is not currently active.',
        'This product does not constitute a public investment product.',
      ],
    });
  } catch (err) {
    console.error('[reserve-manager/coverage] error:', err);
    return res.status(500).json({
      error:     'Failed to compute reserve coverage',
      fetchedAt: new Date().toISOString(),
    });
  }
}
