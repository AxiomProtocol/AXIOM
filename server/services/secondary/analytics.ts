import { pool } from '../../db';

export async function emitAnalyticsEvent(params: {
  seriesId?: string;
  investorId?: string;
  eventType: string;
  actorType?: string;
  objectId?: string;
  objectType?: string;
  valueUnits?: number;
  valueCurrency?: number;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO sec_analytics_events (series_id, investor_id, event_type, actor_type, object_id, object_type, value_units, value_currency, metadata)
       VALUES ($1, $2, $3::sec_analytics_event_type, $4::sec_actor_type, $5, $6::sec_object_type, $7, $8, $9)`,
      [
        params.seriesId || null, params.investorId || null, params.eventType,
        params.actorType || 'system', params.objectId || null, params.objectType || null,
        params.valueUnits || null, params.valueCurrency || null,
        params.metadata ? JSON.stringify(params.metadata) : null,
      ]
    );
  } catch (err) {
    console.error('[sec:analytics] Event emit failed:', err);
  }
}

export async function getSeriesAnalytics(seriesId: string, days = 30) {
  const [eventsResult, tradeSummary, listingSummary, holderSummary] = await Promise.all([
    pool.query(
      `SELECT event_type, COUNT(*) as count, SUM(value_units) as total_units, SUM(value_currency) as total_value
       FROM sec_analytics_events
       WHERE series_id = $1 AND occurred_at >= NOW() - INTERVAL '${days} days'
       GROUP BY event_type ORDER BY count DESC`,
      [seriesId]
    ),
    pool.query(
      `SELECT COUNT(*) as total_trades, SUM(units_traded) as total_units,
              SUM(gross_amount) as total_volume,
              AVG(EXTRACT(EPOCH FROM (si.settled_at - mt.matched_at))/86400) as avg_days_to_settle,
              SUM(CASE WHEN mt.status = 'settled' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) as completion_rate
       FROM sec_matched_trades mt
       LEFT JOIN sec_settlement_instructions si ON si.matched_trade_id = mt.id
       WHERE mt.series_id = $1 AND mt.matched_at >= NOW() - INTERVAL '${days} days'`,
      [seriesId]
    ),
    pool.query(
      `SELECT COUNT(*) as total_listings, COUNT(CASE WHEN status = 'active' THEN 1 END) as active_listings,
              AVG(EXTRACT(EPOCH FROM (CASE WHEN status IN ('matched','cancelled') THEN updated_at ELSE NOW() END - created_at))/86400) as avg_days_active
       FROM sec_listings WHERE series_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'`,
      [seriesId]
    ),
    pool.query(
      `SELECT COUNT(DISTINCT investor_id) as unique_holders
       FROM sec_positions WHERE series_id = $1 AND status != 'fully_transferred'`,
      [seriesId]
    ),
  ]);

  return {
    period: `${days}d`,
    events: eventsResult.rows,
    trades: tradeSummary.rows[0],
    listings: listingSummary.rows[0],
    holders: holderSummary.rows[0],
  };
}

export async function getIssuerDashboard(issuerId: string) {
  const seriesResult = await pool.query(
    `SELECT s.*, ls.score as liquidity_score, ls.score_label,
            COUNT(DISTINCT p.investor_id) as holder_count,
            COALESCE(SUM(p.total_units), 0) as total_units_held,
            COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') as active_listings,
            COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'submitted') as pending_bids,
            COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'pending' AND ar.approval_type = 'issuer_approval') as pending_approvals
     FROM sec_series s
     LEFT JOIN sec_liquidity_scores ls ON ls.series_id = s.id
       AND ls.computed_at = (SELECT MAX(ls2.computed_at) FROM sec_liquidity_scores ls2 WHERE ls2.series_id = s.id)
     LEFT JOIN sec_positions p ON p.series_id = s.id AND p.status != 'fully_transferred'
     LEFT JOIN sec_listings l ON l.series_id = s.id
     LEFT JOIN sec_bids b ON b.listing_id IN (SELECT id FROM sec_listings WHERE series_id = s.id)
     LEFT JOIN sec_approval_requests ar ON ar.transfer_request_id IN (
       SELECT id FROM sec_transfer_requests WHERE series_id = s.id)
     GROUP BY s.id, ls.score, ls.score_label
     ORDER BY s.created_at DESC`
  );
  return seriesResult.rows;
}

export async function getAdminDashboard() {
  const [flaggedTrades, pendingApprovals, recentSettlements, liquidityRisk] = await Promise.all([
    pool.query(
      `SELECT mt.*, s.name as series_name, tr.units_requested
       FROM sec_matched_trades mt
       JOIN sec_series s ON s.id = mt.series_id
       JOIN sec_transfer_requests tr ON tr.id = mt.transfer_request_id
       WHERE mt.status IN ('matched', 'awaiting_approvals')
       ORDER BY mt.matched_at DESC LIMIT 20`
    ),
    pool.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN approval_type = 'issuer_approval' THEN 1 ELSE 0 END) as issuer_pending,
              SUM(CASE WHEN approval_type = 'compliance_approval' THEN 1 ELSE 0 END) as compliance_pending,
              SUM(CASE WHEN approval_type = 'admin_approval' THEN 1 ELSE 0 END) as admin_pending
       FROM sec_approval_requests WHERE status = 'pending'`
    ),
    pool.query(
      `SELECT si.*, mt.series_id, s.name as series_name, mt.gross_amount
       FROM sec_settlement_instructions si
       JOIN sec_matched_trades mt ON mt.id = si.matched_trade_id
       JOIN sec_series s ON s.id = mt.series_id
       ORDER BY si.created_at DESC LIMIT 10`
    ),
    pool.query(
      `SELECT s.name, ls.score, ls.score_label, ls.computed_at
       FROM sec_series s
       LEFT JOIN sec_liquidity_scores ls ON ls.series_id = s.id
       WHERE ls.score < 40 OR ls.id IS NULL
       LIMIT 10`
    ),
  ]);

  return {
    flaggedTrades: flaggedTrades.rows,
    approvalSummary: pendingApprovals.rows[0],
    recentSettlements: recentSettlements.rows,
    liquidityRiskSeries: liquidityRisk.rows,
  };
}

export async function captureSeriesDemandSnapshot(seriesId: string): Promise<void> {
  const result = await pool.query(
    `SELECT
       COUNT(DISTINCT bi.id) FILTER (WHERE bi.status = 'submitted') as buyer_interest_count,
       COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'submitted') as active_bids_count,
       COALESCE(SUM(b.units_requested) FILTER (WHERE b.status = 'submitted'), 0) as total_bid_units,
       COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') as active_listings_count,
       COALESCE(SUM(l.units_remaining) FILTER (WHERE l.status = 'active'), 0) as total_listing_units
     FROM sec_listings l
     LEFT JOIN sec_buyer_interests bi ON bi.listing_id = l.id
     LEFT JOIN sec_bids b ON b.listing_id = l.id
     WHERE l.series_id = $1`,
    [seriesId]
  );
  const d = result.rows[0];
  const totalListingUnits = parseFloat(d.total_listing_units) || 0;
  const totalBidUnits = parseFloat(d.total_bid_units) || 0;
  const ratio = totalListingUnits > 0 ? totalBidUnits / totalListingUnits : null;

  await pool.query(
    `INSERT INTO sec_series_demand_snapshots (series_id, buyer_interest_count, active_bids_count, total_bid_units, active_listings_count, total_listing_units, supply_demand_ratio)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [seriesId, d.buyer_interest_count, d.active_bids_count, totalBidUnits,
      d.active_listings_count, totalListingUnits, ratio]
  );
}
