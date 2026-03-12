import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { dealId, offeringType, walletAddress } = req.body;

    if (!dealId) {
      return res.status(400).json({ success: false, error: 'dealId is required' });
    }

    const dealResult = await pool.query(
      `SELECT d.*, p.address_raw, p.city, p.state, p.zip, p.property_type, p.sqft, p.beds, p.baths, p.year_built
       FROM re_deals d
       LEFT JOIN re_properties p ON d.property_id = p.id
       WHERE d.id = $1`,
      [dealId]
    );

    if (dealResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Deal not found' });
    }

    const deal = dealResult.rows[0];

    const metricsResult = await pool.query(
      `SELECT m.*, s.name as scenario_name, a.*
       FROM re_deal_scenarios s
       LEFT JOIN re_deal_metrics m ON m.scenario_id = s.id
       LEFT JOIN re_deal_assumptions a ON a.scenario_id = s.id
       WHERE s.deal_id = $1
       ORDER BY s.is_primary DESC
       LIMIT 1`,
      [dealId]
    );

    const metrics = metricsResult.rows[0] || {};

    const purchasePrice = parseFloat(metrics.purchase_price) || parseFloat(deal.target_purchase_price) || 0;
    const rehabBudget = parseFloat(metrics.rehab_budget) || 0;
    const downPaymentPct = parseFloat(metrics.down_payment_pct) || 20;
    const closingCostPct = parseFloat(metrics.closing_cost_pct) || 3;

    const downPayment = purchasePrice * (downPaymentPct / 100);
    const closingCosts = purchasePrice * (closingCostPct / 100);
    const sponsorContribution = downPayment + rehabBudget + closingCosts;
    const debtAmount = purchasePrice - downPayment;
    const totalCapitalRequired = purchasePrice + rehabBudget + closingCosts;
    const equityGap = totalCapitalRequired - debtAmount;

    let riskSummary: Record<string, number> = {};
    try {
      const riskResult = await pool.query(
        `SELECT severity, COUNT(*) as cnt FROM re_risk_flags
         WHERE scenario_id = (SELECT id FROM re_deal_scenarios WHERE deal_id = $1 ORDER BY is_primary DESC LIMIT 1)
         GROUP BY severity`,
        [dealId]
      );
      for (const r of riskResult.rows) {
        riskSummary[r.severity] = parseInt(r.cnt);
      }
    } catch {}

    let ivceeScore: number | null = null;
    let viabilityProbability: number | null = null;
    try {
      const ivceeResult = await pool.query(
        `SELECT analysis_data FROM re_saved_analysis
         WHERE deal_id = $1 AND analysis_type = 'ivcee'
         ORDER BY created_at DESC LIMIT 1`,
        [dealId]
      );
      if (ivceeResult.rows.length > 0) {
        const data = ivceeResult.rows[0].analysis_data;
        if (data?.capitalEfficiency?.efficiencyScore) {
          ivceeScore = data.capitalEfficiency.efficiencyScore;
        }
        if (data?.probability?.viabilityProbability) {
          viabilityProbability = data.probability.viabilityProbability;
        }
      }
    } catch {}

    const propertyAddress = deal.address_raw || '';
    const propertyInfo = [deal.property_type, deal.beds ? `${deal.beds}bd` : null, deal.baths ? `${deal.baths}ba` : null, deal.sqft ? `${deal.sqft}sqft` : null].filter(Boolean).join(' | ');
    const slug = `${deal.city || 'deal'}-${deal.state || ''}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const offeringResult = await pool.query(
      `INSERT INTO syn_offerings (
        deal_id, name, slug, status, offering_type, entity_type, description,
        investment_highlights, target_raise, minimum_investment,
        projected_cap_rate, projected_cash_on_cash, projected_irr, projected_dscr,
        hold_period_years, meta, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'draft', $4, 'spv', $5,
        $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, now(), now()
      ) RETURNING id`,
      [
        dealId,
        `${propertyAddress || 'New Offering'} — ${deal.strategy || 'Acquisition'}`,
        slug,
        offeringType || 'clubDeal',
        `${deal.strategy || 'Acquisition'} strategy for ${propertyAddress}. ${propertyInfo}`,
        JSON.stringify([
          propertyAddress ? `Located at ${propertyAddress}` : null,
          deal.strategy ? `${deal.strategy} strategy` : null,
          metrics.noi_annual ? `Projected NOI: $${parseFloat(metrics.noi_annual).toLocaleString()}` : null,
          metrics.cap_rate ? `Cap Rate: ${(parseFloat(metrics.cap_rate) * 100).toFixed(1)}%` : null,
          viabilityProbability ? `IVCEE Viability: ${(viabilityProbability * 100).toFixed(1)}%` : null,
        ].filter(Boolean)),
        equityGap.toFixed(2),
        Math.max(5000, equityGap * 0.05).toFixed(2),
        metrics.cap_rate ? parseFloat(metrics.cap_rate).toFixed(4) : null,
        metrics.cash_on_cash ? parseFloat(metrics.cash_on_cash).toFixed(4) : null,
        null,
        metrics.dscr ? parseFloat(metrics.dscr).toFixed(4) : null,
        Math.max(1, Math.round((parseFloat(metrics.hold_period_months) || 60) / 12)),
        JSON.stringify({
          sourceDeal: {
            dealId,
            strategy: deal.strategy,
            status: deal.status,
            purchasePrice,
            rehabBudget,
            totalCapital: totalCapitalRequired,
            equityRequired: equityGap,
            debtAmount,
            sponsorContribution,
            equityGap,
            propertyAddress,
            propertyInfo,
          },
          capitalReadiness: {
            totalCapitalRequired,
            sponsorContribution,
            debtAmount,
            equityGap,
            ltv: purchasePrice > 0 ? ((debtAmount / purchasePrice) * 100) : 0,
          },
          riskSummary,
          ivcee: {
            efficiencyScore: ivceeScore,
            viabilityProbability,
          },
          createdByWallet: walletAddress || null,
        }),
      ]
    );

    const offeringId = offeringResult.rows[0].id;

    return res.status(201).json({
      success: true,
      offeringId,
      message: 'Offering created from deal',
    });
  } catch (error: any) {
    console.error('[syndication] Create from deal error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create offering' });
  }
}
