import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const totalsResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('drawn', 'repaid', 'defaulted'))::int AS total_originated,
        COALESCE(SUM(drawn_amount_usd) FILTER (WHERE status IN ('drawn', 'repaid', 'defaulted')), 0) AS total_volume_originated_usd,
        COALESCE(SUM(outstanding_balance_usd) FILTER (WHERE status = 'drawn'), 0) AS current_outstanding_usd,
        COALESCE(SUM(interest_earned_usd), 0) AS total_interest_collected_usd,
        COUNT(*) FILTER (WHERE status = 'drawn' AND repayment_due_date < NOW())::int AS overdue_count,
        COUNT(*) FILTER (WHERE status = 'repaid')::int AS repaid_count,
        COUNT(*) FILTER (WHERE status = 'defaulted')::int AS defaulted_count,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active_unfunded_count
      FROM income_credit_lines
    `);

    const recentResult = await pool.query(`
      SELECT
        SUM(interest_repaid_usd) AS recent_interest_distributed_usd,
        COUNT(*)::int AS recent_repayment_events
      FROM income_credit_repayment_history
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);

    const stats = totalsResult.rows[0] || {};
    const recent = recentResult.rows[0] || {};

    const totalOriginated = parseInt(stats.total_originated || '0', 10);
    const totalVolumeUsd = parseFloat(stats.total_volume_originated_usd || '0');
    const currentOutstandingUsd = parseFloat(stats.current_outstanding_usd || '0');
    const totalInterestCollectedUsd = parseFloat(stats.total_interest_collected_usd || '0');
    const recentInterestUsd = parseFloat(recent.recent_interest_distributed_usd || '0');
    const repaidCount = parseInt(stats.repaid_count || '0', 10);
    const defaultedCount = parseInt(stats.defaulted_count || '0', 10);
    const overdueCount = parseInt(stats.overdue_count || '0', 10);
    const repaymentRate = totalOriginated > 0
      ? ((repaidCount / totalOriginated) * 100).toFixed(1)
      : null;

    return res.status(200).json({
      success: true,
      totalLoansOriginated: totalOriginated,
      totalVolumeOriginatedUsd: parseFloat(totalVolumeUsd.toFixed(2)),
      currentOutstandingUsd: parseFloat(currentOutstandingUsd.toFixed(2)),
      totalInterestCollectedUsd: parseFloat(totalInterestCollectedUsd.toFixed(6)),
      recentInterestDistributed30dUsd: parseFloat(recentInterestUsd.toFixed(6)),
      recentRepaymentEvents30d: parseInt(recent.recent_repayment_events || '0', 10),
      repaidCount,
      defaultedCount,
      overdueCount,
      activeLinesUnfunded: parseInt(stats.active_unfunded_count || '0', 10),
      repaymentRatePct: repaymentRate,
      interestRateBps: 500,
      poolNote: 'V1 junior tranche LP positions are managed manually. Interest is distributed atomically on repayment events.',
    });
  } catch (err: any) {
    console.error('[community-credit/junior-pool-stats]', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
