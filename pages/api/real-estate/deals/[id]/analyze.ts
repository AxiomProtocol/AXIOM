import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { analyzeDeal, DealAnalysisInput } from '../../../../../server/services/real-estate/aiAnalysis';
import { successResponse, errorResponse, buildMeta, parseNumeric, safeNum } from '../../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only POST is accepted');
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return errorResponse(res, 400, 'INVALID_ID', 'Deal ID is required');
  }

  try {
    const { scenarioId } = req.body;
    if (!scenarioId || typeof scenarioId !== 'string') {
      return errorResponse(res, 400, 'INVALID_PARAMS', 'scenarioId is required');
    }

    const dealResult = await pool.query(
      `SELECT d.id, d.strategy, d.deal_name, p.address_raw, p.address_normalized,
              p.bedrooms, p.bathrooms, p.square_footage, p.year_built, p.property_type, p.lot_size
       FROM re_deals d
       JOIN re_properties p ON d.property_id = p.id
       WHERE d.id = $1`,
      [id]
    );
    if (dealResult.rows.length === 0) {
      return errorResponse(res, 404, 'DEAL_NOT_FOUND', 'Deal does not exist');
    }
    const deal = dealResult.rows[0];

    const assumptionsResult = await pool.query(
      `SELECT * FROM re_deal_assumptions WHERE scenario_id = $1 LIMIT 1`,
      [scenarioId]
    );
    if (assumptionsResult.rows.length === 0) {
      return errorResponse(res, 400, 'NO_ASSUMPTIONS', 'No assumptions found. Run underwriting first.');
    }
    const a = assumptionsResult.rows[0];

    const metricsResult = await pool.query(
      `SELECT * FROM re_deal_metrics WHERE scenario_id = $1 LIMIT 1`,
      [scenarioId]
    );
    if (metricsResult.rows.length === 0) {
      return errorResponse(res, 400, 'NO_METRICS', 'No metrics found. Run underwriting computation first.');
    }
    const m = metricsResult.rows[0];

    const riskFlagsResult = await pool.query(
      `SELECT flag_type, severity, message FROM re_risk_flags WHERE scenario_id = $1`,
      [scenarioId]
    );

    const p = (v: unknown) => safeNum(parseNumeric(v), 2, 12);

    const input: DealAnalysisInput = {
      property: {
        address: deal.address_normalized || deal.address_raw || 'Unknown',
        bedrooms: deal.bedrooms ? parseNumeric(deal.bedrooms) : undefined,
        bathrooms: deal.bathrooms ? parseNumeric(deal.bathrooms) : undefined,
        squareFootage: deal.square_footage ? parseNumeric(deal.square_footage) : undefined,
        yearBuilt: deal.year_built ? parseNumeric(deal.year_built) : undefined,
        propertyType: deal.property_type || undefined,
        lotSize: deal.lot_size ? parseNumeric(deal.lot_size) : undefined,
      },
      strategy: deal.strategy,
      assumptions: {
        purchasePrice: p(a.purchase_price),
        arvEstimate: p(a.arv_estimate),
        rehabBudget: p(a.rehab_budget),
        monthlyRent: p(a.monthly_rent),
        vacancyPct: p(a.vacancy_pct),
        interestRate: p(a.interest_rate),
        downPaymentPct: p(a.down_payment_pct),
        loanTermYears: parseNumeric(a.loan_term_years),
        annualTaxes: p(a.annual_taxes),
        annualInsurance: p(a.annual_insurance),
        propertyMgmtPct: p(a.property_mgmt_pct),
      },
      metrics: {
        noi: p(m.noi),
        capRate: p(m.cap_rate),
        cashOnCash: p(m.cash_on_cash),
        dscr: p(m.dscr),
        monthlyCashFlow: p(m.monthly_cash_flow),
        annualCashFlow: p(m.annual_cash_flow),
        breakEvenMonths: m.break_even_months ? p(m.break_even_months) : null,
        rehabRoi: p(m.rehab_roi),
        rentToValue: p(m.rent_to_value),
        grm: p(m.grm),
      },
      riskFlags: riskFlagsResult.rows.map((f: any) => ({
        flagType: f.flag_type,
        severity: f.severity,
        message: f.message,
      })),
    };

    const analysis = await analyzeDeal(input);

    await pool.query(
      `INSERT INTO re_decision_log (id, deal_id, decision, decided_by, rationale, snapshot_metrics, decided_at)
       VALUES (gen_random_uuid(), $1, 'AI_ANALYSIS', 'ai_analyst', $2, $3, now())`,
      [
        id,
        `AI Verdict: ${analysis.verdict.toUpperCase()} (${(analysis.confidence * 100).toFixed(0)}% confidence). ${analysis.summary}`,
        JSON.stringify(analysis),
      ]
    );

    return successResponse(res, { analysis }, buildMeta(['internal_db', 'ai_analysis'], analysis.confidence));
  } catch (err: any) {
    console.error('AI analysis error:', err.message);
    return errorResponse(res, 500, 'INTERNAL_ERROR', `AI analysis failed: ${err.message}`);
  }
}
