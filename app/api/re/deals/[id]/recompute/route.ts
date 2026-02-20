import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { computeMetrics, DealStrategy, UnderwritingAssumptions } from '@/lib/underwriting';

function nowIso(): string {
  return new Date().toISOString();
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const dealResult = await db.query(
      `SELECT id, strategy FROM re_deals WHERE id = $1`,
      [id]
    );

    if (dealResult.rows.length === 0) {
      return NextResponse.json(
        {
          data: null,
          meta: { as_of: nowIso(), sources_used: ['internal_db'], confidence: 0, warnings: [] },
          error: { code: 'NOT_FOUND', message: 'Deal not found' },
        },
        { status: 404 }
      );
    }

    const strategy = dealResult.rows[0].strategy as DealStrategy;

    const scenariosResult = await db.query(
      `SELECT s.id, s.scenario_name, a.purchase_price, a.rehab_budget, a.arv_estimate,
              a.down_payment_pct, a.interest_rate, a.loan_term_years, a.closing_cost_pct,
              a.monthly_rent, a.vacancy_pct, a.property_mgmt_pct, a.annual_insurance,
              a.annual_taxes, a.annual_capex, a.annual_maintenance, a.hold_period_months, a.appreciation_pct
       FROM re_deal_scenarios s
       LEFT JOIN re_deal_assumptions a ON a.scenario_id = s.id
       WHERE s.deal_id = $1`,
      [id]
    );

    const computed = [];

    for (const row of scenariosResult.rows) {
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

      await db.query(`DELETE FROM re_deal_metrics WHERE scenario_id = $1`, [row.id]);

      await db.query(
        `INSERT INTO re_deal_metrics (
           scenario_id, noi, cap_rate, cash_on_cash, dscr, monthly_cash_flow,
           annual_cash_flow, computed_at, meta
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8)`,
        [
          row.id,
          result.noi_annual.toFixed(2),
          result.cap_rate.toFixed(6),
          result.cash_on_cash.toFixed(6),
          result.dscr.toFixed(6),
          (result.noi_annual / 12 - result.monthly_debt_service).toFixed(2),
          (result.noi_annual - result.monthly_debt_service * 12).toFixed(2),
          JSON.stringify(result.extra),
        ]
      );

      await db.query(`DELETE FROM re_risk_flags WHERE scenario_id = $1`, [row.id]);

      for (const flag of result.risk_flags) {
        await db.query(
          `INSERT INTO re_risk_flags (scenario_id, flag_type, severity, message)
           VALUES ($1, 'computed', $2, $3)`,
          [row.id, flag.severity, flag.explanation]
        );
      }

      computed.push({
        scenario_id: row.id,
        scenario_name: row.scenario_name,
        metrics: result,
      });
    }

    await db.query(
      `UPDATE re_deals SET status = 'analyzing', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    return NextResponse.json({
      data: { deal_id: id, scenarios_computed: computed.length, scenarios: computed },
      meta: {
        as_of: nowIso(),
        sources_used: ['internal_db', 'derived_computation'],
        confidence: 0.7,
        warnings: scenariosResult.rows.length === 0 ? ['No scenarios found for this deal'] : [],
      },
    });
  } catch (error) {
    console.error('Error in recompute endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: { as_of: nowIso(), sources_used: [], confidence: 0, warnings: ['Internal server error'] },
        error: { code: 'INTERNAL_ERROR', message: 'Failed to recompute metrics' },
      },
      { status: 500 }
    );
  }
}
