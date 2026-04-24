import { pool } from '../../db';

export async function getSeriesPricing(seriesId: string) {
  const [navResult, lastTradeResult, rollingResult] = await Promise.all([
    pool.query(
      `SELECT * FROM sec_nav_marks WHERE series_id = $1 AND nav_status = 'current'
       ORDER BY effective_date DESC LIMIT 1`,
      [seriesId]
    ),
    pool.query(
      `SELECT * FROM sec_trade_marks WHERE series_id = $1 AND status = 'confirmed'
       ORDER BY traded_at DESC LIMIT 1`,
      [seriesId]
    ),
    pool.query(
      `SELECT
         AVG(price_per_unit) as avg_price,
         SUM(units_traded) as total_volume_units,
         SUM(units_traded * price_per_unit) as total_volume_value,
         COUNT(*) as trade_count,
         AVG(premium_discount_to_nav) as avg_premium_discount
       FROM sec_trade_marks
       WHERE series_id = $1 AND status = 'confirmed'
       AND traded_at >= NOW() - INTERVAL '30 days'`,
      [seriesId]
    ),
  ]);

  const nav = navResult.rows[0];
  const lastTrade = lastTradeResult.rows[0];
  const rolling = rollingResult.rows[0];

  const isStaleNav = nav && nav.effective_date
    ? (Date.now() - new Date(nav.effective_date).getTime()) > 90 * 24 * 60 * 60 * 1000
    : true;

  return {
    referenceNav: nav?.nav_per_unit || null,
    navStatus: nav?.nav_status || null,
    navMethod: nav?.method_used || null,
    navDate: nav?.effective_date || null,
    isStaleNav,
    lastTradePrice: lastTrade?.price_per_unit || null,
    lastTradedAt: lastTrade?.traded_at || null,
    lastTradePremiumDiscount: lastTrade?.premium_discount_to_nav || null,
    rolling30d: {
      avgPrice: rolling?.avg_price || null,
      totalVolumeUnits: rolling?.total_volume_units || null,
      totalVolumeValue: rolling?.total_volume_value || null,
      tradeCount: parseInt(rolling?.trade_count || '0'),
      avgPremiumDiscount: rolling?.avg_premium_discount || null,
    },
  };
}

export async function recordNavMark(params: {
  seriesId: string;
  navPerUnit: number;
  methodUsed: string;
  issuedBy?: string;
  notes?: string;
}): Promise<string> {
  await pool.query(
    `UPDATE sec_nav_marks SET nav_status = 'stale' WHERE series_id = $1 AND nav_status = 'current'`,
    [params.seriesId]
  );

  const result = await pool.query(
    `INSERT INTO sec_nav_marks (series_id, nav_per_unit, nav_status, effective_date, method_used, issued_by, notes)
     VALUES ($1, $2, 'current', NOW(), $3::sec_nav_method, $4, $5)
     RETURNING id`,
    [params.seriesId, params.navPerUnit, params.methodUsed, params.issuedBy || null, params.notes || null]
  );

  await pool.query(
    `UPDATE sec_series SET current_nav = $2, updated_at = NOW() WHERE id = $1`,
    [params.seriesId, params.navPerUnit]
  );

  return result.rows[0].id;
}

export async function checkNavDiscountReview(
  seriesId: string,
  pricePerUnit: number
): Promise<{ requiresReview: boolean; discountPct: number | null; threshold: number }> {
  const seriesResult = await pool.query(
    `SELECT current_nav, nav_discount_review_threshold FROM sec_series WHERE id = $1 LIMIT 1`,
    [seriesId]
  );
  const series = seriesResult.rows[0];
  if (!series?.current_nav) return { requiresReview: false, discountPct: null, threshold: 0.10 };

  const nav = parseFloat(series.current_nav);
  const threshold = parseFloat(series.nav_discount_review_threshold || '0.10');
  const discountPct = (nav - pricePerUnit) / nav;

  return {
    requiresReview: discountPct > threshold,
    discountPct,
    threshold,
  };
}

export async function getSeriesMetrics(seriesId: string) {
  const [metricsResult, liquidityResult] = await Promise.all([
    pool.query(
      `SELECT * FROM sec_series_metrics WHERE series_id = $1 ORDER BY snapshot_at DESC LIMIT 1`,
      [seriesId]
    ),
    pool.query(
      `SELECT * FROM sec_liquidity_scores WHERE series_id = $1 ORDER BY computed_at DESC LIMIT 1`,
      [seriesId]
    ),
  ]);
  return {
    metrics: metricsResult.rows[0] || null,
    liquidity: liquidityResult.rows[0] || null,
  };
}

export async function computeAndStoreLiquidityScore(seriesId: string): Promise<number> {
  const [demandResult, supplyResult, velocityResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(DISTINCT buyer_id) as unique_buyers, COUNT(*) as interest_count
       FROM sec_buyer_interests bi
       JOIN sec_listings l ON l.id = bi.listing_id
       WHERE l.series_id = $1 AND bi.submitted_at >= NOW() - INTERVAL '30 days'`,
      [seriesId]
    ),
    pool.query(
      `SELECT COUNT(*) as active_listings, COALESCE(SUM(units_remaining), 0) as total_units
       FROM sec_listings WHERE series_id = $1 AND status = 'active'`,
      [seriesId]
    ),
    pool.query(
      `SELECT COUNT(*) as completed_trades, AVG(EXTRACT(EPOCH FROM (si.settled_at - mt.matched_at))/86400) as avg_days
       FROM sec_matched_trades mt
       LEFT JOIN sec_settlement_instructions si ON si.matched_trade_id = mt.id
       WHERE mt.series_id = $1 AND mt.status = 'settled' AND mt.matched_at >= NOW() - INTERVAL '90 days'`,
      [seriesId]
    ),
  ]);

  const demandScore = Math.min(100, (parseInt(demandResult.rows[0]?.unique_buyers || '0') * 10) +
    (parseInt(demandResult.rows[0]?.interest_count || '0') * 5));
  const supplyScore = Math.min(100, parseInt(supplyResult.rows[0]?.active_listings || '0') * 20);
  const avgDays = parseFloat(velocityResult.rows[0]?.avg_days || '30');
  const velocityScore = Math.max(0, Math.min(100, 100 - (avgDays * 2)));

  const score = (demandScore * 0.4 + supplyScore * 0.3 + velocityScore * 0.3);
  const scoreLabel = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';

  await pool.query(
    `INSERT INTO sec_liquidity_scores (series_id, score, score_label, demand_score, supply_score, velocity_score)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [seriesId, score, scoreLabel, demandScore, supplyScore, velocityScore]
  );

  return score;
}
