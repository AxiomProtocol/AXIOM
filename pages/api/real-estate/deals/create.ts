import type { NextApiRequest, NextApiResponse } from 'next';
import { db, pool } from '../../../../server/db';
import { reProperties } from '../../../../shared/realEstateSchema';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse, buildMeta, safePropertyColumns } from '../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only POST is accepted');
  }

  try {
    const { propertyId, strategy, name, notes } = req.body;

    if (!propertyId || typeof propertyId !== 'string') {
      return errorResponse(res, 400, 'INVALID_PARAMS', 'propertyId is required');
    }

    const validStrategies = ['brrrr', 'flip', 'hold', 'note', 'multifamily'];
    if (!strategy || !validStrategies.includes(strategy)) {
      return errorResponse(res, 400, 'INVALID_STRATEGY', `Strategy must be one of: ${validStrategies.join(', ')}`);
    }

    const [property] = await db.select(safePropertyColumns)
      .from(reProperties)
      .where(eq(reProperties.id, propertyId))
      .limit(1);

    if (!property) {
      return errorResponse(res, 404, 'PROPERTY_NOT_FOUND', 'Referenced property does not exist');
    }

    const dealName = name || `${strategy.toUpperCase()} - ${property.addressNormalized || property.addressRaw}`;

    const dealResult = await pool.query(
      `INSERT INTO re_deals (id, property_id, strategy, status, deal_name, notes, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'draft', $3, $4, now(), now())
       RETURNING id, property_id, strategy, status, deal_name, notes, created_at, updated_at`,
      [propertyId, strategy, dealName, notes || null]
    );
    const deal = dealResult.rows[0];

    const scenarioResult = await pool.query(
      `INSERT INTO re_deal_scenarios (id, deal_id, scenario_name, is_primary, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'Base Case', true, now(), now())
       RETURNING id, deal_id, scenario_name, is_primary`,
      [deal.id]
    );
    const scenario = scenarioResult.rows[0];

    await pool.query(
      `INSERT INTO re_deal_assumptions (id, scenario_id, purchase_price, arv_estimate, rehab_budget,
       down_payment_pct, interest_rate, loan_term_years, closing_cost_pct, monthly_rent,
       vacancy_pct, property_mgmt_pct, annual_insurance, annual_taxes, annual_capex,
       annual_maintenance, hold_period_months, appreciation_pct, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 200000, 280000, 40000, 20, 7.5, 30, 3, 1800, 8, 10,
       1800, 3600, 2000, 2000, 6, 3, now(), now())`,
      [scenario.id]
    );

    await pool.query(
      `INSERT INTO re_decision_log (id, deal_id, decision, decided_by, rationale, decided_at)
       VALUES (gen_random_uuid(), $1, 'DEAL_CREATED', 'system', $2, now())`,
      [deal.id, `Deal workspace created for ${property.addressRaw || property.addressNormalized}. Strategy: ${strategy.toUpperCase()}. Base Case scenario with default assumptions ready for underwriting.`]
    );

    return successResponse(res, { deal, scenario }, buildMeta(['internal_db', 'user_input'], 0.7));

  } catch (err: any) {
    console.error('Deal create error:', err.message);
    return errorResponse(res, 500, 'INTERNAL_ERROR', `Failed to create deal: ${err.message}`);
  }
}
