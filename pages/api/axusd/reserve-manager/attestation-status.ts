/**
 * pages/api/axusd/reserve-manager/attestation-status.ts
 *
 * GET /api/axusd/reserve-manager/attestation-status
 *
 * Returns the attestation and reconciliation status for all registered
 * reserve assets. Used by the operator dashboard and future attestation engine.
 *
 * Phase 2 state: all assets are in NONE attestation status because the
 * attestation infrastructure (attestation URL, CID, publisher) is not yet
 * deployed. This endpoint provides the data model ready for Phase 3 wiring.
 *
 * Status definitions:
 *   NONE          — no attestation configured or required
 *   PENDING       — attestation requested, not yet received
 *   CURRENT       — within freshness window
 *   STALE         — past freshness threshold
 *   FAILED        — request failed or rejected
 *   MANUAL_REVIEW — requires human review
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAttestationStatusSummary } from '../../../../lib/reserves/phase2/reserveManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const result = await getAttestationStatusSummary();

    return res.status(200).json({
      fetchedAt:  result.fetchedAt,
      summary:    result.summary,
      assets:     result.assets,
      phaseNote:
        'Phase 2: attestation infrastructure not yet deployed. ' +
        'All assets are in NONE attestation status. ' +
        'Phase 3 objective: deploy attestation publisher and connect custody proof sources.',
      custodyReadiness: {
        canonicalPsm:
          'On-chain verifiable via balanceOf(CanonicalPSM). No external attestation needed.',
        tokenizedTbill:
          'Attestation infrastructure required. Custody venue not yet selected.',
        operatorTreasury:
          'Internal only. AxiomTreasuryVault positions are verifiable on-chain but are ' +
          'not disclosed as AXUSD reserves.',
      },
    });
  } catch (err) {
    console.error('[reserve-manager/attestation-status] error:', err);
    return res.status(500).json({
      error:     'Failed to load attestation status',
      fetchedAt: new Date().toISOString(),
    });
  }
}
