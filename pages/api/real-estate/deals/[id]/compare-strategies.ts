import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { computeMetrics, ALL_STRATEGIES, STRATEGY_LABELS, type DealStrategy, type UnderwritingAssumptions } from '../../../../../lib/underwriting';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const scenarioResult = await pool.query(
      `SELECT s.id as scenario_id, a.*
       FROM re_deal_scenarios s
       LEFT JOIN re_deal_assumptions a ON a.scenario_id = s.id
       WHERE s.deal_id = $1
       ORDER BY s.is_primary DESC
       LIMIT 1`,
      [id]
    );

    if (scenarioResult.rows.length === 0) {
      return res.status(404).json({ error: 'No scenarios found for this deal' });
    }

    const row = scenarioResult.rows[0];

    const assumptions: UnderwritingAssumptions = {
      purchase_price: parseFloat(row.purchase_price) || 200000,
      rehab_budget: parseFloat(row.rehab_budget) || 0,
      arv_estimate: parseFloat(row.arv_estimate) || parseFloat(row.purchase_price) || 200000,
      down_payment_pct: parseFloat(row.down_payment_pct) || 20,
      interest_rate: parseFloat(row.interest_rate) || 7.5,
      loan_term_years: parseInt(row.loan_term_years) || 30,
      closing_cost_pct: parseFloat(row.closing_cost_pct) || 3,
      monthly_rent: parseFloat(row.monthly_rent) || 1500,
      vacancy_pct: parseFloat(row.vacancy_pct) || 8,
      property_mgmt_pct: parseFloat(row.property_mgmt_pct) || 10,
      annual_insurance: parseFloat(row.annual_insurance) || 1800,
      annual_taxes: parseFloat(row.annual_taxes) || 3600,
      annual_capex: parseFloat(row.annual_capex) || 2000,
      annual_maintenance: parseFloat(row.annual_maintenance) || 2000,
      hold_period_months: parseInt(row.hold_period_months) || 12,
      appreciation_pct: parseFloat(row.appreciation_pct) || 3,
    };

    const comparisons = ALL_STRATEGIES.map((strategy) => {
      try {
        const result = computeMetrics(strategy, assumptions);

        let estimatedRevenue = 0;
        let estimatedProfit = 0;
        let projectedCashFlow = result.extra.annual_cash_flow || 0;
        let timeHorizonMonths = assumptions.hold_period_months;
        let recommendedAction = '';

        switch (strategy) {
          case 'wholesale':
            estimatedRevenue = result.extra.assignment_fee || 0;
            estimatedProfit = estimatedRevenue - result.cash_needed;
            projectedCashFlow = 0;
            timeHorizonMonths = result.extra.time_to_close_months || 2;
            recommendedAction = estimatedProfit > 10000 ? 'Viable assignment opportunity' : 'Thin spread — evaluate buyer demand';
            break;
          case 'flip':
            estimatedRevenue = assumptions.arv_estimate;
            estimatedProfit = result.extra.gross_profit || 0;
            projectedCashFlow = 0;
            timeHorizonMonths = assumptions.hold_period_months;
            recommendedAction = estimatedProfit > 30000 ? 'Strong flip candidate' : 'Verify rehab scope and ARV comps';
            break;
          case 'brrrr':
            estimatedRevenue = result.noi_annual;
            estimatedProfit = result.extra.cash_out || 0;
            projectedCashFlow = result.extra.annual_cash_flow || 0;
            recommendedAction = (result.extra.cash_out || 0) > 0 ? 'Full capital recapture projected' : 'Partial recapture — verify ARV';
            break;
          case 'hold':
            estimatedRevenue = result.noi_annual;
            estimatedProfit = result.extra.total_return || 0;
            projectedCashFlow = result.extra.annual_cash_flow || 0;
            recommendedAction = result.cash_on_cash > 0.08 ? 'Strong long-term hold' : 'Moderate returns — stress test assumptions';
            break;
          case 'shortTermRental':
            estimatedRevenue = result.extra.gross_revenue || 0;
            estimatedProfit = result.extra.annual_cash_flow || 0;
            projectedCashFlow = result.extra.annual_cash_flow || 0;
            recommendedAction = result.cash_on_cash > 0.12 ? 'Strong STR candidate' : 'Validate local STR regulations and demand';
            break;
          case 'sellerFinance':
            estimatedRevenue = result.noi_annual;
            estimatedProfit = result.extra.annual_cash_flow || 0;
            projectedCashFlow = result.extra.annual_cash_flow || 0;
            recommendedAction = result.dscr > 1.25 ? 'Favorable seller finance terms' : 'Negotiate better rate or terms';
            break;
          case 'multifamily':
            estimatedRevenue = result.noi_annual;
            estimatedProfit = result.extra.annual_cash_flow || 0;
            projectedCashFlow = result.extra.annual_cash_flow || 0;
            recommendedAction = result.cap_rate > 0.06 ? 'Solid multifamily acquisition' : 'Cap rate compression — validate rents';
            break;
          case 'note':
            estimatedRevenue = result.extra.annual_yield || 0;
            estimatedProfit = result.extra.total_return || 0;
            projectedCashFlow = result.extra.annual_yield || 0;
            recommendedAction = result.cash_on_cash > 0.06 ? 'Acceptable note yield' : 'Below target return for note purchase';
            break;
        }

        const viabilityScore = computeViability(result, strategy, assumptions);

        return {
          strategy,
          label: STRATEGY_LABELS[strategy],
          viable: viabilityScore >= 40,
          viabilityScore,
          cashRequired: result.cash_needed,
          estimatedRevenue,
          estimatedProfit,
          projectedCashFlow,
          timeHorizonMonths,
          capRate: result.cap_rate,
          cashOnCash: result.cash_on_cash,
          dscr: result.dscr,
          noiAnnual: result.noi_annual,
          riskFlagCount: result.risk_flags.length,
          criticalFlags: result.risk_flags.filter(f => f.severity === 'critical').length,
          topRisks: result.risk_flags.slice(0, 3).map(f => f.explanation),
          recommendedAction,
          extra: result.extra,
        };
      } catch (err: any) {
        return {
          strategy,
          label: STRATEGY_LABELS[strategy],
          viable: false,
          viabilityScore: 0,
          cashRequired: 0,
          estimatedRevenue: 0,
          estimatedProfit: 0,
          projectedCashFlow: 0,
          timeHorizonMonths: 0,
          capRate: 0,
          cashOnCash: 0,
          dscr: 0,
          noiAnnual: 0,
          riskFlagCount: 0,
          criticalFlags: 0,
          topRisks: [],
          recommendedAction: 'Computation error',
          extra: {},
          error: err.message,
        };
      }
    });

    comparisons.sort((a, b) => b.viabilityScore - a.viabilityScore);

    return res.status(200).json({
      success: true,
      dealId: id,
      assumptions,
      comparisons,
      topStrategy: comparisons[0]?.strategy || null,
    });
  } catch (error: any) {
    console.error('[compare-strategies] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to compare strategies' });
  }
}

function computeViability(result: any, strategy: DealStrategy, assumptions: any): number {
  let score = 50;

  const criticalCount = result.risk_flags.filter((f: any) => f.severity === 'critical').length;
  const highCount = result.risk_flags.filter((f: any) => f.severity === 'high').length;
  score -= criticalCount * 20;
  score -= highCount * 10;

  if (strategy === 'wholesale') {
    const fee = result.extra.assignment_fee || 0;
    if (fee > 20000) score += 25;
    else if (fee > 10000) score += 15;
    else if (fee > 5000) score += 5;
    else score -= 15;
    return Math.max(0, Math.min(100, score));
  }

  if (strategy === 'flip') {
    const profit = result.extra.gross_profit || 0;
    const roi = result.extra.roi || 0;
    if (profit > 50000) score += 20;
    else if (profit > 25000) score += 10;
    else if (profit < 0) score -= 25;
    if (roi > 0.25) score += 10;
    return Math.max(0, Math.min(100, score));
  }

  if (result.dscr > 1.5) score += 15;
  else if (result.dscr > 1.25) score += 10;
  else if (result.dscr > 1.0) score += 0;
  else if (result.dscr > 0 && result.dscr < 1.0) score -= 15;

  if (result.cash_on_cash > 0.12) score += 15;
  else if (result.cash_on_cash > 0.08) score += 10;
  else if (result.cash_on_cash > 0.04) score += 0;
  else if (result.cash_on_cash < 0) score -= 15;

  if (result.cap_rate > 0.08) score += 5;
  else if (result.cap_rate > 0.05) score += 0;
  else score -= 5;

  return Math.max(0, Math.min(100, score));
}
