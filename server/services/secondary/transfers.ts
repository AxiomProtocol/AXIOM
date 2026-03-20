import { pool } from '../../db';
import { runTransferChecks } from './compliance';
import { lockUnits, getPosition } from './positions';
import { createListing, activateListing } from './marketplace';
import { auditLog } from './audit';
import { emitAnalyticsEvent } from './analytics';

export async function createTransferRequest(params: {
  sellerId: string;
  seriesId: string;
  unitsRequested: number;
  requestedPricePerUnit?: number;
  requestType?: string;
  settlementAsset?: string;
}): Promise<string> {
  const result = await pool.query(
    `INSERT INTO sec_transfer_requests (
       request_type, status, series_id, seller_id, units_requested,
       requested_price_per_unit, settlement_asset
     ) VALUES ($1::sec_transfer_request_type, 'draft', $2, $3, $4, $5, $6::sec_settlement_asset_type)
     RETURNING id`,
    [
      params.requestType || 'listing', params.seriesId, params.sellerId,
      params.unitsRequested, params.requestedPricePerUnit || null,
      params.settlementAsset || 'axusd',
    ]
  );
  return result.rows[0].id;
}

export async function submitTransferRequest(
  transferRequestId: string,
  sellerId: string,
  buyerId?: string
): Promise<{ status: string; decision: string; blockedReason?: string }> {
  const reqResult = await pool.query(
    `SELECT * FROM sec_transfer_requests WHERE id = $1 AND seller_id = $2 LIMIT 1`,
    [transferRequestId, sellerId]
  );
  if (!reqResult.rows[0]) throw new Error('Transfer request not found');
  const req = reqResult.rows[0];

  await pool.query(
    `UPDATE sec_transfer_requests SET status = 'checks_running', submitted_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [transferRequestId]
  );

  await auditLog({
    actorId: sellerId,
    actorType: 'investor',
    objectType: 'transfer_request',
    objectId: transferRequestId,
    action: 'transfer_request_submitted',
  });

  const effectiveBuyerId = buyerId || 'system';
  const decision = await runTransferChecks(
    transferRequestId, sellerId, effectiveBuyerId,
    req.series_id, parseFloat(req.units_requested), parseFloat(req.requested_price_per_unit)
  );

  let newStatus: string;
  let blockedReason: string | undefined;

  if (decision === 'blocked') {
    newStatus = 'blocked';
    const failedChecks = await pool.query(
      `SELECT detail FROM sec_transfer_checks WHERE transfer_request_id = $1 AND result = 'fail'`,
      [transferRequestId]
    );
    blockedReason = failedChecks.rows.map((r: any) => r.detail).join('; ');

    await emitAnalyticsEvent({
      seriesId: req.series_id, investorId: sellerId,
      eventType: 'transfer_blocked',
      objectId: transferRequestId, objectType: 'transfer_request',
    });
  } else if (decision === 'manual_review_required') {
    newStatus = 'awaiting_approvals';
  } else {
    // Lock the units and advance to awaiting_buyer or awaiting_approvals
    const position = await getPosition(sellerId, req.series_id);
    if (position) {
      await lockUnits(position.id, parseFloat(req.units_requested));
    }
    const series = await pool.query(`SELECT requires_issuer_approval FROM sec_series WHERE id = $1`, [req.series_id]);
    newStatus = series.rows[0]?.requires_issuer_approval ? 'awaiting_approvals' : 'awaiting_buyer';
  }

  await pool.query(
    `UPDATE sec_transfer_requests SET status = $2, buyer_id = $3, blocked_reason = $4, updated_at = NOW()
     WHERE id = $1`,
    [transferRequestId, newStatus, buyerId || null, blockedReason || null]
  );

  return { status: newStatus, decision, blockedReason };
}

export async function createListingFromTransfer(
  transferRequestId: string,
  sellerId: string,
  listingParams: {
    priceType: string;
    askPricePerUnit?: number;
    minimumBidUnits?: number;
    description?: string;
    expiresAt?: Date;
  }
): Promise<string> {
  const req = await pool.query(
    `SELECT * FROM sec_transfer_requests WHERE id = $1 AND seller_id = $2 LIMIT 1`,
    [transferRequestId, sellerId]
  );
  if (!req.rows[0]) throw new Error('Transfer request not found');
  const tr = req.rows[0];

  const position = await getPosition(sellerId, tr.series_id);
  if (!position) throw new Error('Position not found');

  const listingId = await createListing({
    seriesId: tr.series_id,
    sellerId,
    positionId: position.id,
    unitsOffered: parseFloat(tr.units_requested),
    priceType: listingParams.priceType,
    askPricePerUnit: listingParams.askPricePerUnit,
    minimumBidUnits: listingParams.minimumBidUnits,
    description: listingParams.description,
    expiresAt: listingParams.expiresAt,
  });

  await pool.query(
    `UPDATE sec_transfer_requests SET listing_id = $2, status = 'awaiting_buyer', updated_at = NOW() WHERE id = $1`,
    [transferRequestId, listingId]
  );

  await activateListing(listingId);

  await auditLog({
    actorId: sellerId,
    actorType: 'investor',
    objectType: 'listing',
    objectId: listingId,
    action: 'listing_created_from_transfer',
    metadata: { transferRequestId },
  });

  await emitAnalyticsEvent({
    seriesId: tr.series_id, investorId: sellerId,
    eventType: 'listing_activated',
    objectId: listingId, objectType: 'listing',
    valueUnits: parseFloat(tr.units_requested),
  });

  return listingId;
}

export async function getTransferRequests(sellerId: string, status?: string) {
  const conditions = ['tr.seller_id = $1'];
  const values: any[] = [sellerId];
  if (status) { conditions.push(`tr.status = $2`); values.push(status); }

  const result = await pool.query(
    `SELECT tr.*, s.name as series_name, s.asset_class, s.current_nav
     FROM sec_transfer_requests tr
     JOIN sec_series s ON s.id = tr.series_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY tr.created_at DESC LIMIT 50`,
    values
  );
  return result.rows;
}
