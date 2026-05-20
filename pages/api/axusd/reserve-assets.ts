/**
 * pages/api/axusd/reserve-assets.ts
 *
 * GET /api/axusd/reserve-assets
 *
 * Returns the full approved reserve asset registry, segmented by status.
 * Public-safe fields are included. Operator-only and internal assets are
 * omitted unless the operator=true query parameter is provided (requires
 * server-side auth guard in Phase 3 — operator flag is gated here by
 * ADMIN_SOLVENCY_KEY header as a stopgap).
 *
 * Query parameters:
 *   ?status=LIVE|PLANNED|DISABLED|DEPRECATED|INTERNAL_ONLY  (optional filter)
 *   ?sleeve=USDC_PSM|TOKENIZED_TBILL|...                    (optional filter)
 *   ?operator=true                                           (requires auth header)
 *
 * Response always distinguishes:
 *   - live reserve assets
 *   - planned reserve assets
 *   - excluded (disabled/deprecated) assets
 *   - operator-only / internal assets (omitted for public callers)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getApprovedReserveAssetRegistry,
  getLiveReserveAssets,
  getPlannedReserveAssets,
} from '../../../lib/reserves/phase2/approvedReserveAssetRegistry';
import type { ApprovedReserveAsset } from '../../../lib/reserves/phase2/types';

const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY ?? '';

function isOperatorAuthorized(req: NextApiRequest): boolean {
  const header = req.headers['x-admin-key'];
  return !!ADMIN_KEY && header === ADMIN_KEY;
}

function sanitizeForPublic(asset: ApprovedReserveAsset) {
  return {
    id:                       asset.id,
    assetSymbol:              asset.assetSymbol,
    assetDecimals:            asset.assetDecimals,
    chainId:                  asset.chainId,
    sleeve:                   asset.sleeve,
    status:                   asset.status,
    disclosureStatus:         asset.disclosureStatus,
    isLive:                   asset.isLive,
    isPlanned:                asset.isPlanned,
    isRedeemable:             asset.isRedeemable,
    isMintEligible:           asset.isMintEligible,
    isDisclosureEligible:     asset.isDisclosureEligible,
    valuationSource:          asset.valuationSource,
    priceUsdPerUnit:          asset.priceUsdPerUnit,
    currentBalance:           asset.currentBalance,
    grossValueUsd:            asset.grossValueUsd,
    eligibleReserveValueUsd:  asset.eligibleReserveValueUsd,
    haircutBps:               asset.haircutPolicy.haircutBps,
    maxAllocationBps:         asset.haircutPolicy.maxAllocationBps,
    emergencyDisabled:        asset.haircutPolicy.emergencyDisabled,
    attestationStatus:        asset.custody.attestationStatus,
    custodyVenue:             asset.custody.custodyVenue,
    lastValuedAt:             asset.lastValuedAt,
    lastUpdatedAt:            asset.lastUpdatedAt,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const isOperator    = isOperatorAuthorized(req);
  const statusFilter  = req.query.status as string | undefined;
  const sleeveFilter  = req.query.sleeve as string | undefined;

  const registry = getApprovedReserveAssetRegistry();

  // For public callers, hide INTERNAL and OPERATOR_ONLY assets
  const visibleAssets = isOperator
    ? registry
    : registry.filter(a =>
        a.disclosureStatus === 'PUBLIC' || a.disclosureStatus === 'PENDING_REVIEW'
      );

  let filtered = visibleAssets;
  if (statusFilter) {
    filtered = filtered.filter(a => a.status === statusFilter.toUpperCase());
  }
  if (sleeveFilter) {
    filtered = filtered.filter(a => a.sleeve === sleeveFilter.toUpperCase());
  }

  const liveAssets     = getLiveReserveAssets().filter(a =>
    visibleAssets.some(v => v.id === a.id)
  );
  const plannedAssets  = getPlannedReserveAssets().filter(a =>
    visibleAssets.some(v => v.id === a.id)
  );

  const serialized = isOperator
    ? filtered
    : filtered.map(sanitizeForPublic);

  return res.status(200).json({
    fetchedAt: new Date().toISOString(),
    isOperatorView: isOperator,
    counts: {
      total:   filtered.length,
      live:    liveAssets.length,
      planned: plannedAssets.length,
    },
    assets:  serialized,
    warnings: [
      'PLANNED assets are listed for transparency only.',
      'PLANNED assets do not count toward live AXUSD reserve coverage.',
      'This registry is the Phase 2 in-memory seed. Phase 3 will replace with DB-backed data.',
    ],
    disclosureNote:
      'Live AXUSD backing is provided exclusively by the CanonicalPSM USDC sleeve. ' +
      'Tokenized Treasury and T-Bill sleeves are planned infrastructure, not current backing.',
  });
}
