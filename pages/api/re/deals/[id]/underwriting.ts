import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const { id } = req.query;
  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return res.status(400).json({ error: { message: 'Invalid deal ID.' } });
  }

  try {
    const dealResult = await pool.query(
      `SELECT d.id, d.deal_name, d.strategy, d.status, d.target_purchase_price, d.notes,
              p.address_normalized, p.city, p.state, p.zip,
              p.property_type, p.sqft, p.bedrooms
       FROM re_deals d
       JOIN re_properties p ON p.id = d.property_id
       WHERE d.id = $1`,
      [id]
    );

    if (dealResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Deal not found.' } });
    }

    const [scenariosResult, riskResult, decisionsResult] = await Promise.all([
      pool.query(
        `SELECT
           s.id, s.scenario_name, s.is_primary,
           a.purchase_price, a.rehab_budget, a.arv_estimate, a.monthly_rent,
           a.down_payment_pct, a.interest_rate, a.vacancy_pct,
           m.noi, m.cap_rate, m.cash_on_cash, m.dscr,
           m.monthly_cash_flow, m.annual_cash_flow, m.computed_at
         FROM re_deal_scenarios s
         LEFT JOIN LATERAL (
           SELECT * FROM re_deal_assumptions
           WHERE scenario_id = s.id
           ORDER BY created_at DESC
           LIMIT 1
         ) a ON true
         LEFT JOIN LATERAL (
           SELECT * FROM re_deal_metrics
           WHERE scenario_id = s.id
           ORDER BY computed_at DESC
           LIMIT 1
         ) m ON true
         WHERE s.deal_id = $1
         ORDER BY s.is_primary DESC, s.created_at ASC`,
        [id]
      ),
      pool.query(
        `SELECT rf.scenario_id, rf.flag_type, rf.severity, rf.message, rf.is_resolved
         FROM re_risk_flags rf
         JOIN re_deal_scenarios s ON s.id = rf.scenario_id
         WHERE s.deal_id = $1 AND rf.is_resolved = false
         ORDER BY
           CASE rf.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
           rf.created_at DESC`,
        [id]
      ),
      pool.query(
        `SELECT id, decided_by, decision, rationale, decided_at
         FROM re_decision_log
         WHERE deal_id = $1
         ORDER BY decided_at DESC
         LIMIT 20`,
        [id]
      ),
    ]);

    return res.status(200).json({
      data: {
        deal: dealResult.rows[0],
        scenarios: scenariosResult.rows,
        risk_flags: riskResult.rows,
        recent_decisions: decisionsResult.rows,
      },
      meta: {
        as_of: new Date().toISOString().split('T')[0],
        confidence: 0.85,
      },
    });
  } catch (error: any) {
    console.error('[api/re/deals/[id]/underwriting]', error);
    return res.status(500).json({ error: { message: 'Failed to load deal.' } });
  }
}
