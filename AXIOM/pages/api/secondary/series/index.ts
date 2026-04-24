import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { getSecSession } from '../../../../server/services/secondary/auth';
import { getSeriesPricing, getSeriesMetrics } from '../../../../server/services/secondary/pricing';
import { emitAnalyticsEvent } from '../../../../server/services/secondary/analytics';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const session = await getSecSession(req);

    const result = await pool.query(
      `SELECT s.*,
              COUNT(DISTINCT p.investor_id) as holder_count,
              COALESCE(SUM(p.total_units), 0) as total_units_held,
              COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') as active_listing_count,
              ls.score as liquidity_score, ls.score_label
       FROM sec_series s
       LEFT JOIN sec_positions p ON p.series_id = s.id AND p.status != 'fully_transferred'
       LEFT JOIN sec_listings l ON l.series_id = s.id
       LEFT JOIN sec_liquidity_scores ls ON ls.series_id = s.id
         AND ls.computed_at = (SELECT MAX(ls2.computed_at) FROM sec_liquidity_scores ls2 WHERE ls2.series_id = s.id)
       WHERE s.status = 'active'
       GROUP BY s.id, ls.score, ls.score_label
       ORDER BY s.created_at DESC`
    );

    if (session?.investorId) {
      await emitAnalyticsEvent({ investorId: session.investorId, eventType: 'series_viewed', actorType: 'investor' });
    }

    return res.status(200).json({ success: true, series: result.rows });
  }

  if (req.method === 'POST') {
    const session = await getSecSession(req);
    if (!session) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (!session.roles.includes('issuer') && !session.roles.includes('admin')) {
      return res.status(403).json({ success: false, error: 'Issuer role required' });
    }

    const { name, assetClass, description, navMethod, distributionFrequency, transferabilityStatus,
      settlementAsset, minimumInvestmentUnits, holdPeriodDays, totalUnitsIssued, unitPrice,
      navDiscountReviewThreshold, requiresIssuerApproval } = req.body;

    if (!name || !assetClass) return res.status(400).json({ success: false, error: 'name and assetClass required' });
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO sec_series (name, slug, asset_class, description, nav_method, distribution_frequency,
        transferability_status, settlement_asset, minimum_investment_units, hold_period_days,
        total_units_issued, unit_price, nav_discount_review_threshold, requires_issuer_approval, status)
       VALUES ($1, $2, $3::sec_asset_class, $4, $5::sec_nav_method, $6::sec_distribution_frequency,
         $7::sec_transferability_status, $8::sec_settlement_asset_type, $9, $10, $11, $12, $13, $14, 'draft')
       RETURNING *`,
      [name, slug, assetClass, description || null, navMethod || 'cost_basis',
       distributionFrequency || 'quarterly', transferabilityStatus || 'issuer_approval_required',
       settlementAsset || 'axusd', minimumInvestmentUnits || 1, holdPeriodDays || 0,
       totalUnitsIssued || 0, unitPrice || null, navDiscountReviewThreshold || 0.10,
       requiresIssuerApproval !== false]
    );

    await pool.query(
      `INSERT INTO sec_approval_policies (series_id, approval_type, is_required, timeout_hours)
       VALUES ($1, 'issuer_approval', TRUE, 72)`,
      [result.rows[0].id]
    );

    return res.status(201).json({ success: true, series: result.rows[0] });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
