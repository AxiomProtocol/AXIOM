import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';
import { getSIWESession } from '../../../lib/middleware/siweAuth';
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
    const session = await getSIWESession(req);
    if (!session) {
      return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
    }

    const actorAddress = session.address;

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
    } = req.body;

    if (!dealId || actualRehabCost == null || actualTimelineDays == null) {
      return res.status(400).json({ error: 'dealId, actualRehabCost, and actualTimelineDays are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const dealCheck = await client.query(
        `SELECT id, created_by_wallet FROM re_deals WHERE id = $1 LIMIT 1`,
        [dealId]
      );
      if (dealCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Deal not found.' });
      }
      const dealOwner = dealCheck.rows[0].created_by_wallet;
      if (dealOwner && dealOwner.toLowerCase() !== actorAddress.toLowerCase()) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          error: 'Only the deal operator can submit outcomes for this deal.',
          code: 'DEAL_OPERATOR_ONLY',
        });
      }

      let resolvedScenarioId = scenarioId || null;

      if (!resolvedScenarioId) {
        const scenRes = await client.query(
          `SELECT id FROM re_deal_scenarios WHERE deal_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [dealId]
        );
        if (scenRes.rows.length > 0) resolvedScenarioId = scenRes.rows[0].id;
      }

      if (!resolvedScenarioId) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'No financial scenario found for this deal. Create a scenario before submitting an outcome.',
          code: 'NO_SCENARIO',
        });
      }

      const asmRes = await client.query(
        `SELECT * FROM re_deal_assumptions WHERE scenario_id = $1 LIMIT 1`,
        [resolvedScenarioId]
      );
      if (asmRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'No financial assumptions found for this scenario. Add assumptions before submitting an outcome.',
          code: 'NO_ASSUMPTIONS',
        });
      }
      const assumptions = asmRes.rows[0];

      const metRes = await client.query(
        `SELECT * FROM re_deal_metrics WHERE scenario_id = $1 ORDER BY computed_at DESC LIMIT 1`,
        [resolvedScenarioId]
      );
      const metrics = metRes.rows.length > 0 ? metRes.rows[0] : null;

      const metaPayload = JSON.stringify({ dispositionType: dispositionType || 'sale', contractorName: contractorName || null });

      const insertRes = await client.query(
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
          actorAddress,
          metaPayload,
        ]
      );

      const outcome = insertRes.rows[0];

      const predictedDscr = metrics ? Number(metrics.dscr) || 0 : 0;
      const predictedCashFlow = metrics ? Number(metrics.monthly_cash_flow) || 0 : 0;
      const predictedTotalReturn = metrics ? Number(metrics.total_return) || 0 : 0;

      const predicted = {
        rehabBudget: Number(assumptions.rehab_budget) || 0,
        holdPeriodMonths: Number(assumptions.hold_period_months) || 6,
        arvEstimate: Number(assumptions.arv_estimate) || 0,
        monthlyRent: Number(assumptions.monthly_rent) || 0,
        dscr: predictedDscr,
        monthlyCashFlow: predictedCashFlow,
      };

      const actual = {
        rehabCost: Number(actualRehabCost),
        timelineDays: Number(actualTimelineDays),
        salePrice: actualSalePrice != null ? Number(actualSalePrice) : Number(assumptions.arv_estimate) || 0,
        rent: actualRent != null ? Number(actualRent) : Number(assumptions.monthly_rent) || 0,
        dscr: actualDscr != null ? Number(actualDscr) : 0,
        monthlyCashFlow: actualMonthlyCashFlow != null ? Number(actualMonthlyCashFlow) : 0,
      };

      const snapshot = computeVarianceSnapshot(predicted, actual);

      const actualTotalReturn = actualSalePrice != null
        ? Number(actualSalePrice) - Number(assumptions.arv_estimate || 0) + (actual.monthlyCashFlow * Number(assumptions.hold_period_months || 6))
        : actual.monthlyCashFlow * Number(assumptions.hold_period_months || 6);

      const allVarianceRows: Array<[string, number, number, number, number]> = [
        ...Object.entries(snapshot).map(([key, v]) => [key, v.predicted, v.actual, v.variance, v.variancePct] as [string, number, number, number, number]),
        [
          'total_return',
          predictedTotalReturn,
          actualTotalReturn,
          Number((actualTotalReturn - predictedTotalReturn).toFixed(2)),
          predictedTotalReturn !== 0 ? Number((((actualTotalReturn - predictedTotalReturn) / predictedTotalReturn) * 100).toFixed(4)) : 0,
        ],
      ];

      const valuePlaceholders = allVarianceRows
        .map((_, i) => {
          const base = i * 8;
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, NOW())`;
        })
        .join(', ');

      const flatValues = allVarianceRows.flatMap(([key, predicted_value, actual_value, variance_value, variance_pct]) => [
        dealId, resolvedScenarioId, outcome.id, key, predicted_value, actual_value, variance_value, variance_pct,
      ]);

      await client.query(
        `INSERT INTO prediction_actual_variances (
          deal_id, scenario_id, outcome_id, metric_key,
          predicted_value, actual_value, variance_value, variance_pct,
          created_at
        ) VALUES ${valuePlaceholders}`,
        flatValues
      );

      await client.query(
        `INSERT INTO verified_data_rewards (
          outcome_id, wallet_address, reward_type, reward_ref, created_at
        ) VALUES ($1, $2, 'outcome_submission', 'eligible_pending_review', NOW())`,
        [outcome.id, actorAddress]
      );

      await client.query('COMMIT');

      try {
        const profileRes = await pool.query(
          `SELECT id FROM operator_strategy_profiles WHERE operator_wallet = $1 LIMIT 1`,
          [actorAddress]
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
            [actorAddress]
          );
          profileId = newProfile.rows[0].id;
        }

        const rehabCostNum = Number(actualRehabCost);
        const rentNum = actualRent != null ? Number(actualRent) : 0;
        const prevRentEst = Number(assumptions.monthly_rent) || 0;
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
      await client.query('ROLLBACK').catch(() => {});
      console.error('POST /api/verified-outcomes error:', err.message);
      return res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
