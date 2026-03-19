import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';
import { computeVarianceSnapshot } from '../../../server/services/real-estate/verifiedOutcomes';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { dealId } = req.query;
    if (!dealId || typeof dealId !== 'string') {
      return res.status(400).json({ error: 'dealId query param is required' });
    }
    try {
      const outcomeRes = await pool.query(
        `SELECT vpo.*, rd.deal_name
         FROM verified_project_outcomes vpo
         LEFT JOIN re_deals rd ON rd.id = vpo.deal_id
         WHERE vpo.deal_id = $1
         ORDER BY vpo.submitted_at DESC
         LIMIT 1`,
        [dealId]
      );
      if (outcomeRes.rows.length === 0) {
        return res.status(200).json({ outcome: null, variances: [] });
      }
      const outcome = outcomeRes.rows[0];
      const varianceRes = await pool.query(
        `SELECT * FROM prediction_actual_variances WHERE outcome_id = $1 ORDER BY metric_key`,
        [outcome.id]
      );
      return res.status(200).json({ outcome, variances: varianceRes.rows });
    } catch (err: any) {
      console.error('GET /api/verified-outcomes error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const {
      dealId,
      scenarioId,
      actualRehabCost,
      actualTimelineDays,
      dispositionType,
      actualSalePrice,
      actualRent,
      actualDscr,
      actualMonthlyCashFlow,
      contractorName,
      fundingPath,
      lenderPathChosen,
      submittedBy,
    } = req.body;

    if (!dealId || actualRehabCost == null || actualTimelineDays == null) {
      return res.status(400).json({ error: 'dealId, actualRehabCost, and actualTimelineDays are required' });
    }

    try {
      let resolvedScenarioId = scenarioId || null;
      let assumptions: any = null;

      if (!resolvedScenarioId) {
        const scenRes = await pool.query(
          `SELECT id FROM re_deal_scenarios WHERE deal_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [dealId]
        );
        if (scenRes.rows.length > 0) resolvedScenarioId = scenRes.rows[0].id;
      }

      if (resolvedScenarioId) {
        const asmRes = await pool.query(
          `SELECT * FROM re_deal_assumptions WHERE scenario_id = $1 LIMIT 1`,
          [resolvedScenarioId]
        );
        if (asmRes.rows.length > 0) assumptions = asmRes.rows[0];
      }

      const metaPayload = JSON.stringify({ dispositionType: dispositionType || 'sale', contractorName: contractorName || null });

      const insertRes = await pool.query(
        `INSERT INTO verified_project_outcomes (
          deal_id, scenario_id, status,
          actual_rehab_cost, actual_timeline_days,
          actual_sale_price, actual_rent, actual_dscr, actual_monthly_cash_flow,
          funding_path, lender_path_chosen,
          axm_reward_eligible, submitted_by, meta,
          submitted_at, created_at, updated_at
        ) VALUES (
          $1, $2, 'submitted',
          $3, $4,
          $5, $6, $7, $8,
          $9, $10,
          TRUE, $11, $12,
          NOW(), NOW(), NOW()
        ) RETURNING *`,
        [
          dealId,
          resolvedScenarioId,
          Number(actualRehabCost),
          Number(actualTimelineDays),
          actualSalePrice != null ? Number(actualSalePrice) : null,
          actualRent != null ? Number(actualRent) : null,
          actualDscr != null ? Number(actualDscr) : null,
          actualMonthlyCashFlow != null ? Number(actualMonthlyCashFlow) : null,
          fundingPath || null,
          lenderPathChosen || null,
          submittedBy || 'unknown',
          metaPayload,
        ]
      );

      const outcome = insertRes.rows[0];

      if (assumptions) {
        const predicted = {
          rehabBudget: Number(assumptions.rehab_budget) || 0,
          holdPeriodMonths: Number(assumptions.hold_period_months) || 6,
          arvEstimate: Number(assumptions.arv_estimate) || 0,
          monthlyRent: Number(assumptions.monthly_rent) || 0,
          dscr: 0,
          monthlyCashFlow: 0,
        };

        const actual = {
          rehabCost: Number(actualRehabCost),
          timelineDays: Number(actualTimelineDays),
          salePrice: actualSalePrice != null ? Number(actualSalePrice) : Number(assumptions.arv_estimate) || 0,
          rent: actualRent != null ? Number(actualRent) : 0,
          dscr: actualDscr != null ? Number(actualDscr) : 0,
          monthlyCashFlow: actualMonthlyCashFlow != null ? Number(actualMonthlyCashFlow) : 0,
        };

        const snapshot = computeVarianceSnapshot(predicted, actual);

        const varianceRows = Object.entries(snapshot).map(([key, v]) => [
          dealId,
          resolvedScenarioId,
          outcome.id,
          key,
          v.predicted,
          v.actual,
          v.variance,
          v.variancePct,
        ]);

        for (const row of varianceRows) {
          await pool.query(
            `INSERT INTO prediction_actual_variances (
              deal_id, scenario_id, outcome_id, metric_key,
              predicted_value, actual_value, variance_value, variance_pct,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            row
          );
        }
      }

      if (submittedBy && submittedBy !== 'unknown') {
        await pool.query(
          `INSERT INTO verified_data_rewards (
            outcome_id, wallet_address, reward_type, reward_ref, created_at
          ) VALUES ($1, $2, 'outcome_submission', 'eligible_pending_review', NOW())`,
          [outcome.id, submittedBy]
        );
      }

      try {
        const profileRes = await pool.query(
          `SELECT id FROM operator_strategy_profiles WHERE operator_wallet = $1 LIMIT 1`,
          [submittedBy || 'unknown']
        );

        let profileId: string;
        if (profileRes.rows.length > 0) {
          profileId = profileRes.rows[0].id;
          await pool.query(
            `UPDATE operator_strategy_profiles SET observations = observations + 1, updated_at = NOW() WHERE id = $1`,
            [profileId]
          );
        } else {
          const newProfile = await pool.query(
            `INSERT INTO operator_strategy_profiles (
              operator_wallet, strategy_type, observations, created_at, updated_at
            ) VALUES ($1, 'classic_value_add', 1, NOW(), NOW()) RETURNING id`,
            [submittedBy || 'unknown']
          );
          profileId = newProfile.rows[0].id;
        }

        const rehabCostNum = Number(actualRehabCost);
        const rentNum = actualRent != null ? Number(actualRent) : 0;
        const prevRentEst = assumptions ? Number(assumptions.monthly_rent) || 0 : 0;
        const rentLift = rentNum > 0 && prevRentEst > 0 ? rentNum - prevRentEst : null;
        const cashFlowNum = actualMonthlyCashFlow != null ? Number(actualMonthlyCashFlow) : null;
        const noiLift = cashFlowNum != null ? cashFlowNum * 12 : null;

        await pool.query(
          `INSERT INTO operator_strategy_signals (
            profile_id, deal_id, outcome_id,
            capex_per_unit, rent_lift, noi_lift, stabilization_days,
            confidence, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0.7, NOW())`,
          [
            profileId,
            dealId,
            outcome.id,
            rehabCostNum > 0 ? rehabCostNum : null,
            rentLift,
            noiLift,
            Number(actualTimelineDays) || null,
          ]
        );
      } catch (signalErr: any) {
        console.warn('Operator strategy signal write failed (non-blocking):', signalErr.message);
      }

      const varianceRes = await pool.query(
        `SELECT * FROM prediction_actual_variances WHERE outcome_id = $1 ORDER BY metric_key`,
        [outcome.id]
      );

      return res.status(201).json({ outcome, variances: varianceRes.rows });
    } catch (err: any) {
      console.error('POST /api/verified-outcomes error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
