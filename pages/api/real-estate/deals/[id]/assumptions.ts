import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { successResponse, errorResponse, buildMeta, parseNumeric, safeNum, safeInt } from '../../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return errorResponse(res, 400, 'INVALID_ID', 'Deal ID is required');
  }

  if (req.method === 'GET') {
    try {
      const { scenario_id } = req.query;
      if (!scenario_id || typeof scenario_id !== 'string') {
        return errorResponse(res, 400, 'INVALID_PARAMS', 'scenario_id query param is required');
      }
      const result = await pool.query(
        `SELECT * FROM re_deal_assumptions WHERE scenario_id = $1 LIMIT 1`,
        [scenario_id]
      );
      return successResponse(res, { assumptions: result.rows[0] || null }, buildMeta(['internal_db'], result.rows.length > 0 ? 0.7 : 0.4));
    } catch (err: any) {
      console.error('Assumptions fetch error:', err.message);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch assumptions');
    }
  }

  if (req.method === 'PUT') {
    try {
      const { scenarioId, ...values } = req.body;
      if (!scenarioId || typeof scenarioId !== 'string') {
        return errorResponse(res, 400, 'INVALID_PARAMS', 'scenarioId is required in request body');
      }

      const scenarioCheck = await pool.query(
        `SELECT id, deal_id FROM re_deal_scenarios WHERE id = $1`,
        [scenarioId]
      );
      if (scenarioCheck.rows.length === 0 || scenarioCheck.rows[0].deal_id !== id) {
        return errorResponse(res, 404, 'SCENARIO_NOT_FOUND', 'Scenario not found for this deal');
      }

      const money14 = (v: unknown) => safeNum(parseNumeric(v), 2, 12);
      const money12 = (v: unknown) => safeNum(parseNumeric(v), 2, 10);
      const money10 = (v: unknown) => safeNum(parseNumeric(v), 2, 8);
      const pct5 = (v: unknown) => safeNum(parseNumeric(v), 2, 3);
      const rate5 = (v: unknown) => safeNum(parseNumeric(v), 3, 2);

      const params = [
        money14(values.purchasePrice),
        money14(values.arvEstimate),
        money12(values.rehabBudget),
        pct5(values.downPaymentPct),
        rate5(values.interestRate),
        safeInt(parseNumeric(values.loanTermYears, 30), 100) ?? 30,
        pct5(values.closingCostPct),
        money10(values.monthlyRent),
        pct5(values.vacancyPct),
        pct5(values.propertyMgmtPct),
        money10(values.annualInsurance),
        money10(values.annualTaxes),
        money10(values.annualCapex),
        money10(values.annualMaintenance),
        safeInt(parseNumeric(values.holdPeriodMonths, 6), 1200) ?? 6,
        pct5(values.appreciationPct),
      ];

      const existing = await pool.query(
        `SELECT id FROM re_deal_assumptions WHERE scenario_id = $1`,
        [scenarioId]
      );

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE re_deal_assumptions SET
           purchase_price = $1, arv_estimate = $2, rehab_budget = $3,
           down_payment_pct = $4, interest_rate = $5, loan_term_years = $6,
           closing_cost_pct = $7, monthly_rent = $8, vacancy_pct = $9,
           property_mgmt_pct = $10, annual_insurance = $11, annual_taxes = $12,
           annual_capex = $13, annual_maintenance = $14, hold_period_months = $15,
           appreciation_pct = $16, updated_at = now()
           WHERE scenario_id = $17`,
          [...params, scenarioId]
        );
      } else {
        await pool.query(
          `INSERT INTO re_deal_assumptions (id, scenario_id,
           purchase_price, arv_estimate, rehab_budget, down_payment_pct,
           interest_rate, loan_term_years, closing_cost_pct, monthly_rent,
           vacancy_pct, property_mgmt_pct, annual_insurance, annual_taxes,
           annual_capex, annual_maintenance, hold_period_months, appreciation_pct,
           created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, $15, $16, $17, now(), now())`,
          [scenarioId, ...params]
        );
      }

      const result = await pool.query(
        `SELECT * FROM re_deal_assumptions WHERE scenario_id = $1 LIMIT 1`,
        [scenarioId]
      );

      return successResponse(res, { assumptions: result.rows[0] }, buildMeta(['internal_db', 'user_input'], 0.7));
    } catch (err: any) {
      console.error('Assumptions upsert error:', err.message);
      return errorResponse(res, 500, 'INTERNAL_ERROR', `Failed to save assumptions: ${err.message}`);
    }
  }

  return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET and PUT are accepted');
}
