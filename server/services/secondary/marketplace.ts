import { pool } from '../../db';
import { auditLog } from './audit';

export async function createListing(params: {
  seriesId: string;
  sellerId: string;
  positionId: string;
  unitsOffered: number;
  priceType: string;
  askPricePerUnit?: number;
  minimumBidUnits?: number;
  visibilityScope?: string;
  settlementWindowDays?: number;
  description?: string;
  expiresAt?: Date;
}): Promise<string> {
  const result = await pool.query(
    `INSERT INTO sec_listings (
       series_id, seller_id, position_id, listing_type, status,
       units_offered, units_remaining, price_type, ask_price_per_unit,
       minimum_bid_units, visibility_scope, settlement_window_days,
       description, expires_at
     ) VALUES ($1, $2, $3, 'bulletin_board', 'draft', $4, $4, $5::sec_price_type, $6, $7, $8::sec_visibility_scope, $9, $10, $11)
     RETURNING id`,
    [
      params.seriesId, params.sellerId, params.positionId,
      params.unitsOffered, params.priceType, params.askPricePerUnit || null,
      params.minimumBidUnits || 1, params.visibilityScope || 'all_eligible',
      params.settlementWindowDays || 5, params.description || null,
      params.expiresAt || null,
    ]
  );
  const listingId = result.rows[0].id;

  await auditLog({
    actorId: params.sellerId,
    actorType: 'investor',
    objectType: 'listing',
    objectId: listingId,
    action: 'listing_created',
  });

  return listingId;
}

export async function activateListing(listingId: string): Promise<void> {
  await pool.query(
    `UPDATE sec_listings SET status = 'active', activated_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'draft'`,
    [listingId]
  );
}

export async function getListings(params: {
  seriesId?: string;
  status?: string;
  buyerInvestorId?: string;
  limit?: number;
  offset?: number;
}) {
  const conditions: string[] = ['l.status = $1'];
  const values: any[] = [params.status || 'active'];
  let idx = 2;

  if (params.seriesId) {
    conditions.push(`l.series_id = $${idx++}`);
    values.push(params.seriesId);
  }

  const result = await pool.query(
    `SELECT l.*,
            s.name as series_name, s.slug as series_slug, s.asset_class, s.current_nav,
            s.transferability_status, s.settlement_asset,
            i.legal_name as seller_name, i.investor_category as seller_category,
            nm.nav_per_unit as latest_nav,
            (SELECT COUNT(*) FROM sec_bids b WHERE b.listing_id = l.id AND b.status NOT IN ('rejected','withdrawn','expired')) as active_bid_count
     FROM sec_listings l
     JOIN sec_series s ON s.id = l.series_id
     JOIN sec_investors i ON i.id = l.seller_id
     LEFT JOIN sec_nav_marks nm ON nm.series_id = l.series_id AND nm.nav_status = 'current'
     WHERE ${conditions.join(' AND ')}
     ORDER BY l.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, params.limit || 50, params.offset || 0]
  );
  return result.rows;
}

export async function getListing(listingId: string) {
  const result = await pool.query(
    `SELECT l.*,
            s.name as series_name, s.asset_class, s.current_nav, s.unit_price,
            s.settlement_asset, s.nav_discount_review_threshold,
            i.legal_name as seller_name,
            nm.nav_per_unit as latest_nav,
            tm.price_per_unit as last_trade_price, tm.traded_at as last_trade_at
     FROM sec_listings l
     JOIN sec_series s ON s.id = l.series_id
     JOIN sec_investors i ON i.id = l.seller_id
     LEFT JOIN sec_nav_marks nm ON nm.series_id = l.series_id AND nm.nav_status = 'current'
     LEFT JOIN sec_trade_marks tm ON tm.series_id = l.series_id AND tm.status = 'confirmed'
       AND tm.traded_at = (SELECT MAX(tm2.traded_at) FROM sec_trade_marks tm2 WHERE tm2.series_id = l.series_id)
     WHERE l.id = $1 LIMIT 1`,
    [listingId]
  );
  return result.rows[0] || null;
}

export async function submitBid(params: {
  listingId: string;
  buyerId: string;
  buyerWalletAddress?: string;
  unitsRequested: number;
  bidPricePerUnit: number;
  expiresAt?: Date;
}): Promise<string> {
  const totalBidAmount = params.unitsRequested * params.bidPricePerUnit;

  const result = await pool.query(
    `INSERT INTO sec_bids (listing_id, buyer_id, buyer_wallet_address, units_requested, bid_price_per_unit, total_bid_amount, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      params.listingId, params.buyerId, params.buyerWalletAddress || null,
      params.unitsRequested, params.bidPricePerUnit, totalBidAmount,
      params.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ]
  );
  const bidId = result.rows[0].id;

  await auditLog({
    actorId: params.buyerId,
    actorType: 'investor',
    objectType: 'bid',
    objectId: bidId,
    action: 'bid_submitted',
    metadata: { listingId: params.listingId, units: params.unitsRequested },
  });

  return bidId;
}

export async function getListingBids(listingId: string) {
  const result = await pool.query(
    `SELECT b.*, i.legal_name as buyer_name, i.investor_category as buyer_category
     FROM sec_bids b
     JOIN sec_investors i ON i.id = b.buyer_id
     WHERE b.listing_id = $1
     ORDER BY b.submitted_at DESC`,
    [listingId]
  );
  return result.rows;
}

export async function acceptBid(bidId: string, sellerId: string): Promise<string> {
  const bidResult = await pool.query(
    `SELECT b.*, l.seller_id, l.series_id, l.position_id, l.settlement_window_days
     FROM sec_bids b JOIN sec_listings l ON l.id = b.listing_id
     WHERE b.id = $1 LIMIT 1`,
    [bidId]
  );
  if (!bidResult.rows[0]) throw new Error('Bid not found');
  const bid = bidResult.rows[0];

  if (bid.seller_id !== sellerId) throw new Error('Unauthorized');

  await pool.query(
    `UPDATE sec_bids SET status = 'accepted', responded_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [bidId]
  );

  await pool.query(
    `UPDATE sec_bids SET status = 'rejected', responded_at = NOW(), updated_at = NOW()
     WHERE listing_id = $1 AND id != $2 AND status = 'submitted'`,
    [bid.listing_id, bidId]
  );

  await pool.query(
    `UPDATE sec_listings SET status = 'matched', updated_at = NOW() WHERE id = $1`,
    [bid.listing_id]
  );

  const grossAmount = parseFloat(bid.units_requested) * parseFloat(bid.bid_price_per_unit);
  const feesAmount = grossAmount * 0.005;
  const netAmount = grossAmount - feesAmount;

  const tradeResult = await pool.query(
    `INSERT INTO sec_matched_trades (
       series_id, listing_id, bid_id, seller_id, buyer_id,
       units_traded, agreed_price_per_unit, gross_amount, fees_amount, net_seller_proceeds,
       status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'matched')
     RETURNING id`,
    [
      bid.series_id, bid.listing_id, bidId, bid.seller_id, bid.buyer_id,
      bid.units_requested, bid.bid_price_per_unit, grossAmount, feesAmount, netAmount,
    ]
  );

  await auditLog({
    actorId: sellerId,
    actorType: 'investor',
    objectType: 'matched_trade',
    objectId: tradeResult.rows[0].id,
    action: 'bid_accepted',
    metadata: { bidId, listingId: bid.listing_id },
  });

  return tradeResult.rows[0].id;
}

export async function submitBuyerInterest(params: {
  listingId: string;
  buyerId: string;
  intendedUnits?: number;
  message?: string;
}): Promise<string> {
  const result = await pool.query(
    `INSERT INTO sec_buyer_interests (listing_id, buyer_id, intended_units, message)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [params.listingId, params.buyerId, params.intendedUnits || null, params.message || null]
  );
  return result.rows[0].id;
}
