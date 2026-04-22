import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function nowIso(): string {
  return new Date().toISOString();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const dealResult = await db.query(
      `SELECT d.id, d.deal_name, d.strategy, d.status, d.target_purchase_price, d.notes,
              p.address_normalized, p.city, p.state, p.zip, p.property_type, p.sqft, p.bedrooms
       FROM re_deals d
       JOIN re_properties p ON p.id = d.property_id
       WHERE d.id = $1`,
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

    const scenariosResult = await db.query(
      `SELECT s.id, s.scenario_name, s.is_primary,
              a.purchase_price, a.rehab_budget, a.arv_estimate, a.monthly_rent,
              a.down_payment_pct, a.interest_rate, a.vacancy_pct,
              m.noi, m.cap_rate, m.cash_on_cash, m.dscr,
              m.monthly_cash_flow, m.annual_cash_flow, m.computed_at
       FROM re_deal_scenarios s
       LEFT JOIN re_deal_assumptions a ON a.scenario_id = s.id
       LEFT JOIN re_deal_metrics m ON m.scenario_id = s.id
       WHERE s.deal_id = $1
       ORDER BY s.is_primary DESC, m.computed_at DESC`,
      [id]
    );

    const flagsResult = await db.query(
      `SELECT f.scenario_id, f.flag_type, f.severity, f.message, f.is_resolved
       FROM re_risk_flags f
       JOIN re_deal_scenarios s ON s.id = f.scenario_id
       WHERE s.deal_id = $1 AND f.is_resolved = FALSE
       ORDER BY CASE f.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`,
      [id]
    );

    const decisionsResult = await db.query(
      `SELECT id, decided_by, decision, rationale, decided_at
       FROM re_decision_log WHERE deal_id = $1 ORDER BY decided_at DESC LIMIT 5`,
      [id]
    );

    const hasMetrics = scenariosResult.rows.some((r: Record<string, unknown>) => r.noi !== null);
    const hasCriticalFlags = flagsResult.rows.some((r: Record<string, unknown>) => r.severity === 'critical');
    const confidence = hasMetrics ? (hasCriticalFlags ? 0.7 : 1.0) : 0.4;

    return NextResponse.json({
      data: {
        deal: dealResult.rows[0],
        scenarios: scenariosResult.rows,
        risk_flags: flagsResult.rows,
        recent_decisions: decisionsResult.rows,
      },
      meta: {
        as_of: nowIso(),
        sources_used: ['internal_db', 'derived_computation'],
        confidence,
        warnings: hasCriticalFlags ? ['Critical risk flags present - review before proceeding'] : [],
      },
    });
  } catch (error) {
    console.error('Error in underwriting endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: { as_of: nowIso(), sources_used: [], confidence: 0, warnings: ['Internal server error'] },
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch underwriting summary' },
      },
      { status: 500 }
    );
  }
}
