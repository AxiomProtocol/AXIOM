import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { computeMetrics, type DealStrategy } from '../../../../../lib/underwriting/index';
import type { UnderwritingAssumptions } from '../../../../../lib/underwriting/strategies/base';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const { id } = req.query;
  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return res.status(400).json({ error: { message: 'Invalid deal ID.' } });
  }

  try {
    const dealResult = await pool.query(
      'SELECT id, strategy FROM re_deals WHERE id = $1',
      [id]
    );
    if (dealResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Deal not found.' } });
    }

    const strategy = dealResult.rows[0].strategy as DealStrategy;

    const scenariosResult = await pool.query(
      `SELECT s.id,
              a.purchase_price, a.rehab_budget, a.arv_estimate, a.down_payment_pct,
              a.interest_rate, a.loan_term_years, a.closing_cost_pct, a.monthly_rent,
              a.vacancy_pct, a.property_mgmt_pct, a.annual_insurance, a.annual_taxes,
              a.annual_capex, a.annual_maintenance, a.hold_period_months, a.appreciation_pct
       FROM re_deal_scenarios s
       LEFT JOIN LATERAL (
         SELECT * FROM re_deal_assumptions
         WHERE scenario_id = s.id
         ORDER BY created_at DESC
         LIMIT 1
       ) a ON true
       WHERE s.deal_id = $1`,
      [id]
    );

    let computed = 0;

    for (const row of scenariosResult.rows) {
      const scenarioId: string = row.id;

      if (row.purchase_price === null || row.purchase_price === undefined) continue;

      const assumptions: UnderwritingAssumptions = {
        purchase_price: parseFloat(row.purchase_price) || 0,
        rehab_budget: parseFloat(row.rehab_budget) || 0,
        arv_estimate: parseFloat(row.arv_estimate) || 0,
        down_payment_pct: parseFloat(row.down_payment_pct) || 20,
        interest_rate: parseFloat(row.interest_rate) || 7,
        loan_term_years: parseInt(row.loan_term_years) || 30,
        closing_cost_pct: parseFloat(row.closing_cost_pct) || 3,
        monthly_rent: parseFloat(row.monthly_rent) || 0,
        vacancy_pct: parseFloat(row.vacancy_pct) || 5,
        property_mgmt_pct: parseFloat(row.property_mgmt_pct) || 10,
        annual_insurance: parseFloat(row.annual_insurance) || 0,
        annual_taxes: parseFloat(row.annual_taxes) || 0,
        annual_capex: parseFloat(row.annual_capex) || 0,
        annual_maintenance: parseFloat(row.annual_maintenance) || 0,
        hold_period_months: parseInt(row.hold_period_months) || 60,
        appreciation_pct: parseFloat(row.appreciation_pct) || 3,
      };

      const result = computeMetrics(strategy, assumptions);

      const annualCashFlow = result.extra.annual_cash_flow ?? 0;
      const monthlyCashFlow = annualCashFlow / 12;

      await pool.query('BEGIN');
      try {
        await pool.query(
          `INSERT INTO re_deal_metrics
             (id, scenario_id, noi, cap_rate, cash_on_cash, dscr,
              monthly_cash_flow, annual_cash_flow, computed_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            scenarioId,
            result.noi_annual,
            result.cap_rate,
            result.cash_on_cash,
            result.dscr,
            monthlyCashFlow,
            annualCashFlow,
          ]
        );

        await pool.query(
          'DELETE FROM re_risk_flags WHERE scenario_id = $1 AND is_resolved = false',
          [scenarioId]
        );

        for (const flag of result.risk_flags) {
          await pool.query(
            `INSERT INTO re_risk_flags (id, scenario_id, flag_type, severity, message, is_resolved)
             VALUES (gen_random_uuid(), $1, 'computed', $2, $3, false)`,
            [scenarioId, flag.severity, flag.explanation]
          );
        }

        await pool.query('COMMIT');
      } catch (txErr) {
        await pool.query('ROLLBACK');
        throw txErr;
      }

      computed++;
    }

    return res.status(200).json({ data: { scenarios_computed: computed } });
  } catch (error: any) {
    console.error('[api/re/deals/[id]/recompute]', error);
    return res.status(500).json({ error: { message: 'Recompute failed.' } });
  }
}
