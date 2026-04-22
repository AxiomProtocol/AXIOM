import { pool } from '../../server/db';
import type {
  ProbabilityResult,
  SensitivityRow,
  StressTestResult,
  RefinanceRiskResult,
  DownsideResult,
  CapitalEfficiencyResult,
} from './models';

export async function upsertProbabilityModel(dealId: string, scenarioId: string, r: ProbabilityResult) {
  await pool.query(
    `DELETE FROM ivcee_probability_models WHERE deal_id = $1 AND scenario_id = $2`,
    [dealId, scenarioId]
  );
  await pool.query(
    `INSERT INTO ivcee_probability_models
      (deal_id, scenario_id, base_viability_score, viability_probability, failure_probability, dominant_risk_factor)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [dealId, scenarioId, r.baseViabilityScore, r.viabilityProbability, r.failureProbability, r.dominantRiskFactor]
  );
}

export async function insertSensitivityRows(dealId: string, scenarioId: string, rows: SensitivityRow[]) {
  await pool.query(
    `DELETE FROM ivcee_sensitivity_matrix WHERE deal_id = $1 AND scenario_id = $2`,
    [dealId, scenarioId]
  );
  for (const r of rows) {
    await pool.query(
      `INSERT INTO ivcee_sensitivity_matrix
        (deal_id, scenario_id, price_delta, rent_delta, rate_delta, dscr_output, cashflow_output, viability_shift)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [dealId, scenarioId, r.priceDelta, r.rentDelta, r.rateDelta, r.dscrOutput, r.cashflowOutput, r.viabilityShift]
    );
  }
}

export async function insertStressRows(dealId: string, scenarioId: string, rows: StressTestResult[]) {
  await pool.query(
    `DELETE FROM ivcee_stress_tests WHERE deal_id = $1 AND scenario_id = $2`,
    [dealId, scenarioId]
  );
  for (const r of rows) {
    await pool.query(
      `INSERT INTO ivcee_stress_tests
        (deal_id, scenario_id, scenario_type, dscr_stressed, cashflow_stressed, drawdown_projection, survival_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [dealId, scenarioId, r.scenarioType, r.dscrStressed, r.cashflowStressed, r.drawdownProjection, r.survivalStatus]
    );
  }
}

export async function upsertRefinanceRisk(dealId: string, scenarioId: string, r: RefinanceRiskResult) {
  await pool.query(
    `DELETE FROM ivcee_refinance_risk WHERE deal_id = $1 AND scenario_id = $2`,
    [dealId, scenarioId]
  );
  await pool.query(
    `INSERT INTO ivcee_refinance_risk
      (deal_id, scenario_id, refinance_ltv, refinance_dscr, equity_extracted, refinance_probability, failure_conditions)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [dealId, scenarioId, r.refinanceLtv, r.refinanceDscr, r.equityExtracted, r.refinanceProbability, r.failureConditions]
  );
}

export async function upsertDownsideMetrics(dealId: string, scenarioId: string, r: DownsideResult) {
  await pool.query(
    `DELETE FROM ivcee_downside_metrics WHERE deal_id = $1 AND scenario_id = $2`,
    [dealId, scenarioId]
  );
  await pool.query(
    `INSERT INTO ivcee_downside_metrics
      (deal_id, scenario_id, break_even_rent, break_even_price, max_safe_ltv, margin_of_safety)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [dealId, scenarioId, r.breakEvenRent, r.breakEvenPrice, r.maxSafeLtv, r.marginOfSafety]
  );
}

export async function upsertCapitalEfficiency(dealId: string, scenarioId: string, r: CapitalEfficiencyResult) {
  await pool.query(
    `DELETE FROM ivcee_capital_efficiency WHERE deal_id = $1 AND scenario_id = $2`,
    [dealId, scenarioId]
  );
  await pool.query(
    `INSERT INTO ivcee_capital_efficiency
      (deal_id, scenario_id, roi_adjusted, volatility_penalty, leverage_penalty, efficiency_score, capital_rank)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [dealId, scenarioId, r.roiAdjusted, r.volatilityPenalty, r.leveragePenalty, r.efficiencyScore, r.capitalRank]
  );
}

export async function recomputeCapitalRanks() {
  await pool.query(`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY efficiency_score DESC) as rank
      FROM ivcee_capital_efficiency
      WHERE efficiency_score IS NOT NULL
    )
    UPDATE ivcee_capital_efficiency ce
    SET capital_rank = r.rank
    FROM ranked r
    WHERE ce.id = r.id
  `);
}
