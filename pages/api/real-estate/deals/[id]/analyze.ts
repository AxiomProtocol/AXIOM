import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { analyzeDeal, DealAnalysisInput } from '../../../../../server/services/real-estate/aiAnalysis';
import { successResponse, errorResponse, buildMeta, parseNumeric } from '../../../../../server/services/real-estate/helpers';

export const config = {
  maxDuration: 60,
};

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
      `SELECT d.id, d.strategy, d.deal_name, d.property_id,
              p.address_raw, p.address_normalized,
              p.bedrooms, p.bathrooms, p.sqft, p.year_built, p.property_type, p.lot_sqft
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

    let compsCount = 0;
    let taxYearsCount = 0;
    let saleCount = 0;
    let compsData: any[] = [];
    let avmData: any = null;

    try {
      const compsResult = await pool.query(
        `SELECT address, sale_price, price_per_sqft, sqft, bedrooms, bathrooms, distance_miles, sale_date
         FROM re_comparables WHERE deal_id = $1 AND sale_price > 0
         ORDER BY distance_miles ASC NULLS LAST LIMIT 15`,
        [id]
      );
      compsData = compsResult.rows;
      compsCount = compsData.length;

      const avmResult = await pool.query(
        `SELECT meta->'avm' as avm FROM re_deals WHERE id = $1`,
        [id]
      );
      avmData = avmResult.rows[0]?.avm || null;
    } catch { /* table may not exist */ }

    try {
      const taxResult = await pool.query(
        `SELECT count(*) as cnt FROM re_tax_history WHERE property_id = $1`,
        [deal.property_id]
      );
      taxYearsCount = parseInt(taxResult.rows[0]?.cnt || '0', 10);
    } catch { /* table may not exist */ }

    try {
      const saleResult = await pool.query(
        `SELECT count(*) as cnt FROM re_sale_history WHERE property_id = $1`,
        [deal.property_id]
      );
      saleCount = parseInt(saleResult.rows[0]?.cnt || '0', 10);
    } catch { /* table may not exist */ }

    const missingFields: string[] = [];
    if (!deal.bedrooms) missingFields.push('bedrooms');
    if (!deal.bathrooms) missingFields.push('bathrooms');
    if (!deal.sqft) missingFields.push('square footage');
    if (!deal.year_built) missingFields.push('year built');
    if (!deal.property_type) missingFields.push('property type');
    if (!deal.lot_sqft) missingFields.push('lot size');

    const hasPropertyFacts = missingFields.length <= 2;
    const hasComps = compsCount > 0;
    const hasTaxHistory = taxYearsCount > 0;
    const hasSaleHistory = saleCount > 0;

    let completenessScore = 0.4;
    if (hasPropertyFacts) completenessScore += 0.15;
    if (hasComps) completenessScore += 0.15 + Math.min(compsCount / 10, 1) * 0.1;
    if (hasTaxHistory) completenessScore += 0.1;
    if (hasSaleHistory) completenessScore += 0.1;
    completenessScore -= missingFields.length * 0.03;
    completenessScore = Math.max(0.2, Math.min(1.0, completenessScore));

    const input: DealAnalysisInput = {
      property: {
        address: deal.address_normalized || deal.address_raw || 'Unknown',
        bedrooms: deal.bedrooms ? parseNumeric(deal.bedrooms) : undefined,
        bathrooms: deal.bathrooms ? parseNumeric(deal.bathrooms) : undefined,
        squareFootage: deal.sqft ? parseNumeric(deal.sqft) : undefined,
        yearBuilt: deal.year_built ? parseNumeric(deal.year_built) : undefined,
        propertyType: deal.property_type || undefined,
        lotSize: deal.lot_sqft ? parseNumeric(deal.lot_sqft) : undefined,
      },
      strategy: deal.strategy,
      assumptions: {
        purchasePrice: parseNumeric(a.purchase_price),
        arvEstimate: parseNumeric(a.arv_estimate),
        rehabBudget: parseNumeric(a.rehab_budget),
        monthlyRent: parseNumeric(a.monthly_rent),
        vacancyPct: parseNumeric(a.vacancy_pct),
        interestRate: parseNumeric(a.interest_rate),
        downPaymentPct: parseNumeric(a.down_payment_pct),
        loanTermYears: parseNumeric(a.loan_term_years),
        annualTaxes: parseNumeric(a.annual_taxes),
        annualInsurance: parseNumeric(a.annual_insurance),
        propertyMgmtPct: parseNumeric(a.property_mgmt_pct),
      },
      metrics: {
        noi: parseNumeric(m.noi),
        capRate: parseNumeric(m.cap_rate),
        cashOnCash: parseNumeric(m.cash_on_cash),
        dscr: parseNumeric(m.dscr),
        monthlyCashFlow: parseNumeric(m.monthly_cash_flow),
        annualCashFlow: parseNumeric(m.annual_cash_flow),
        breakEvenMonths: m.break_even_months ? parseNumeric(m.break_even_months) : null,
        rehabRoi: parseNumeric(m.rehab_roi),
        rentToValue: parseNumeric(m.rent_to_value),
        grm: parseNumeric(m.grm),
      },
      riskFlags: riskFlagsResult.rows.map((f: any) => ({
        flagType: f.flag_type,
        severity: f.severity,
        message: f.message,
      })),
      dataCompleteness: {
        hasPropertyFacts,
        hasComps,
        hasTaxHistory,
        hasSaleHistory,
        compsCount,
        taxYearsCount,
        missingFields,
        score: completenessScore,
      },
      comparables: compsData.map((c: any) => ({
        address: c.address || 'Unknown',
        salePrice: parseFloat(c.sale_price) || 0,
        pricePerSqft: c.price_per_sqft ? parseFloat(c.price_per_sqft) : null,
        sqft: c.sqft ? parseInt(c.sqft) : null,
        bedrooms: c.bedrooms != null ? parseInt(c.bedrooms) : null,
        bathrooms: c.bathrooms != null ? parseFloat(c.bathrooms) : null,
        distanceMiles: c.distance_miles ? parseFloat(c.distance_miles) : null,
        saleDate: c.sale_date ? new Date(c.sale_date).toLocaleDateString() : null,
      })),
      avm: avmData ? {
        value: parseFloat(avmData.value) || 0,
        rangeLow: avmData.rangeLow ? parseFloat(avmData.rangeLow) : null,
        rangeHigh: avmData.rangeHigh ? parseFloat(avmData.rangeHigh) : null,
      } : null,
    };

    const analysis = await analyzeDeal(input);

    const verdictLabel = analysis.verdict.replace(/_/g, ' ');
    await pool.query(
      `INSERT INTO re_decision_log (id, deal_id, decision, decided_by, rationale, snapshot_metrics, decided_at)
       VALUES (gen_random_uuid(), $1, 'AI_ANALYSIS', 'ai_advisor', $2, $3, now())`,
      [
        id,
        `AI Verdict: ${verdictLabel} (${(analysis.confidence * 100).toFixed(0)}% confidence). Max offer: $${(analysis.offerStrategy?.maxOfferPrice || 0).toLocaleString()}. ${analysis.summary}`,
        JSON.stringify(analysis),
      ]
    );

    return successResponse(res, { analysis, dataCompleteness: input.dataCompleteness }, buildMeta(['internal_db', 'ai_analysis'], analysis.confidence));
  } catch (err: any) {
    console.error('AI analysis error:', err.message, err.stack);
    return errorResponse(res, 500, 'INTERNAL_ERROR', `AI analysis failed: ${err.message}`);
  }
}
