import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

function toInt(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? null : n;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const { id } = req.query;
  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return res.status(400).json({ error: { message: 'Invalid deal ID.' } });
  }

  const body = req.body || {};
  const scenarioId = body.scenario_id;
  if (typeof scenarioId !== 'string' || !UUID_RE.test(scenarioId)) {
    return res.status(400).json({ error: { message: 'Invalid scenario_id.' } });
  }

  try {
    const scenarioCheck = await pool.query(
      'SELECT id FROM re_deal_scenarios WHERE id = $1 AND deal_id = $2',
      [scenarioId, id]
    );
    if (scenarioCheck.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Scenario not found.' } });
    }

    await pool.query(
      `INSERT INTO re_deal_assumptions
         (id, scenario_id, purchase_price, rehab_budget, arv_estimate,
          down_payment_pct, interest_rate, loan_term_years, closing_cost_pct,
          monthly_rent, vacancy_pct, property_mgmt_pct,
          annual_insurance, annual_taxes, annual_capex, annual_maintenance,
          hold_period_months, appreciation_pct)
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        scenarioId,
        toNum(body.purchase_price),
        toNum(body.rehab_budget),
        toNum(body.arv_estimate),
        toNum(body.down_payment_pct),
        toNum(body.interest_rate),
        toInt(body.loan_term_years),
        toNum(body.closing_cost_pct),
        toNum(body.monthly_rent),
        toNum(body.vacancy_pct),
        toNum(body.property_mgmt_pct),
        toNum(body.annual_insurance),
        toNum(body.annual_taxes),
        toNum(body.annual_capex),
        toNum(body.annual_maintenance),
        toInt(body.hold_period_months),
        toNum(body.appreciation_pct),
      ]
    );

    return res.status(200).json({ data: { saved: true } });
  } catch (error: any) {
    console.error('[api/re/deals/[id]/assumptions]', error);
    return res.status(500).json({ error: { message: 'Failed to save assumptions.' } });
  }
}
