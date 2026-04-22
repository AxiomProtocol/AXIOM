import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function nowIso(): string {
  return new Date().toISOString();
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      scenario_id,
      purchase_price,
      rehab_budget,
      arv_estimate,
      down_payment_pct,
      interest_rate,
      loan_term_years,
      closing_cost_pct,
      monthly_rent,
      vacancy_pct,
      property_mgmt_pct,
      annual_insurance,
      annual_taxes,
      annual_capex,
      annual_maintenance,
      hold_period_months,
      appreciation_pct,
      meta,
    } = body;

    if (!scenario_id) {
      return NextResponse.json(
        {
          data: null,
          meta: { as_of: nowIso(), sources_used: ['user_input'], confidence: 0, warnings: [] },
          error: { code: 'MISSING_PARAMS', message: 'scenario_id is required' },
        },
        { status: 400 }
      );
    }

    const scenarioCheck = await db.query(
      `SELECT id FROM re_deal_scenarios WHERE id = $1 AND deal_id = $2`,
      [scenario_id, id]
    );

    if (scenarioCheck.rows.length === 0) {
      return NextResponse.json(
        {
          data: null,
          meta: { as_of: nowIso(), sources_used: ['internal_db'], confidence: 0, warnings: [] },
          error: { code: 'NOT_FOUND', message: 'Scenario not found for this deal' },
        },
        { status: 404 }
      );
    }

    await db.query(`DELETE FROM re_deal_assumptions WHERE scenario_id = $1`, [scenario_id]);

    const result = await db.query(
      `INSERT INTO re_deal_assumptions (
         scenario_id, purchase_price, rehab_budget, arv_estimate, down_payment_pct,
         interest_rate, loan_term_years, closing_cost_pct, monthly_rent, vacancy_pct,
         property_mgmt_pct, annual_insurance, annual_taxes, annual_capex, annual_maintenance,
         hold_period_months, appreciation_pct, meta
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING id, scenario_id, purchase_price, monthly_rent, created_at`,
      [
        scenario_id, purchase_price ?? null, rehab_budget ?? null, arv_estimate ?? null,
        down_payment_pct ?? null, interest_rate ?? null, loan_term_years ?? null,
        closing_cost_pct ?? null, monthly_rent ?? null, vacancy_pct ?? null,
        property_mgmt_pct ?? null, annual_insurance ?? null, annual_taxes ?? null,
        annual_capex ?? null, annual_maintenance ?? null, hold_period_months ?? null,
        appreciation_pct ?? null, meta ? JSON.stringify(meta) : null,
      ]
    );

    return NextResponse.json(
      {
        data: result.rows[0],
        meta: {
          as_of: nowIso(),
          sources_used: ['user_input'],
          confidence: 0.4,
          warnings: [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in assumptions POST endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: { as_of: nowIso(), sources_used: [], confidence: 0, warnings: ['Internal server error'] },
        error: { code: 'INTERNAL_ERROR', message: 'Failed to upsert assumptions' },
      },
      { status: 500 }
    );
  }
}
