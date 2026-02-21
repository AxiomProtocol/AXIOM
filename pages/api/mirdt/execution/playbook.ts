import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

interface DailyAggregate {
  date: string;
  trades: number;
  wins: number;
  losses: number;
  flats: number;
  dailyPnl: number;
  cumulativePnl: number;
}

interface PlaybookMetrics {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  flats: number;
  winRate: number;
  totalPnl: number;
  avgPnlPerTrade: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  bestTrade: number;
  worstTrade: number;
  avgTradeDurationMinutes: number;
  sharpeEstimate: number;
  targetUsd: number;
  targetDays: number;
  daysElapsed: number;
  progressPct: number;
  projectedDaysToTarget: number | null;
  onTrack: boolean;
  startDate: string;
  endDate: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const targetUsd = Math.max(1, Math.min(1000000, parseFloat(req.query.target as string) || 100));
    const targetDays = Math.max(1, Math.min(365, parseInt(req.query.days as string) || 30));
    const windowDays = Math.max(1, Math.min(365, parseInt(req.query.window as string) || targetDays));

    const tradesResult = await pool.query(
      `SELECT 
        t.id, t.setup_id, t.direction, t.entry_price, t.exit_price,
        t.pnl, t.pnl_pct, t.outcome, t.status, t.exit_reason,
        t.opened_at, t.closed_at, t.decision_id, t.quantity,
        d.symbol, d.asset_type, d.grade, d.entry_trigger, d.policy_mode,
        d.stop_price, d.take_profit_p50, d.take_profit_p95,
        d.confidence_score, d.signal_z, d.regime_tier, d.risk_budget_usd
      FROM mirdt_paper_trades t
      LEFT JOIN mirdt_execution_decisions d ON d.id = t.decision_id
      WHERE t.opened_at >= NOW() - make_interval(days => $1)
      ORDER BY t.opened_at ASC`,
      [windowDays]
    );

    const trades = tradesResult.rows;

    const closedTrades = trades.filter((t: any) => t.status === 'CLOSED');
    const openTrades = trades.filter((t: any) => t.status === 'OPEN');
    const wins = closedTrades.filter((t: any) => t.outcome === 'WIN');
    const losses = closedTrades.filter((t: any) => t.outcome === 'LOSS');
    const flats = closedTrades.filter((t: any) => t.outcome === 'FLAT');

    const totalPnl = closedTrades.reduce((sum: number, t: any) => sum + parseFloat(t.pnl || '0'), 0);
    const grossWins = wins.reduce((sum: number, t: any) => sum + parseFloat(t.pnl || '0'), 0);
    const grossLosses = Math.abs(losses.reduce((sum: number, t: any) => sum + parseFloat(t.pnl || '0'), 0));

    const dailyMap: Record<string, { trades: number; wins: number; losses: number; flats: number; pnl: number }> = {};
    for (const t of closedTrades) {
      const day = new Date(t.closed_at).toISOString().split('T')[0];
      if (!dailyMap[day]) dailyMap[day] = { trades: 0, wins: 0, losses: 0, flats: 0, pnl: 0 };
      dailyMap[day].trades++;
      if (t.outcome === 'WIN') dailyMap[day].wins++;
      else if (t.outcome === 'LOSS') dailyMap[day].losses++;
      else dailyMap[day].flats++;
      dailyMap[day].pnl += parseFloat(t.pnl || '0');
    }

    const sortedDays = Object.keys(dailyMap).sort();
    let cumPnl = 0;
    const dailyAggregates: DailyAggregate[] = sortedDays.map(date => {
      const d = dailyMap[date];
      cumPnl += d.pnl;
      return {
        date,
        trades: d.trades,
        wins: d.wins,
        losses: d.losses,
        flats: d.flats,
        dailyPnl: parseFloat(d.pnl.toFixed(2)),
        cumulativePnl: parseFloat(cumPnl.toFixed(2)),
      };
    });

    const closedByCloseTime = [...closedTrades].sort((a: any, b: any) => {
      const aTime = a.closed_at ? new Date(a.closed_at).getTime() : 0;
      const bTime = b.closed_at ? new Date(b.closed_at).getTime() : 0;
      return aTime - bTime;
    });

    let maxDrawdown = 0;
    let peak = 0;
    const pnlValues: number[] = [];
    cumPnl = 0;
    for (const t of closedByCloseTime) {
      const pnlVal = parseFloat(t.pnl || '0');
      cumPnl += isNaN(pnlVal) ? 0 : pnlVal;
      pnlValues.push(isNaN(pnlVal) ? 0 : pnlVal);
      if (cumPnl > peak) peak = cumPnl;
      const dd = peak - cumPnl;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const dailyPnls = sortedDays.map(d => dailyMap[d].pnl);
    const meanDailyPnl = dailyPnls.length > 0 ? dailyPnls.reduce((a, b) => a + b, 0) / dailyPnls.length : 0;
    const stdDailyPnl = dailyPnls.length > 1
      ? Math.sqrt(dailyPnls.reduce((sum, p) => sum + Math.pow(p - meanDailyPnl, 2), 0) / (dailyPnls.length - 1))
      : 0;
    const sharpeEstimate = stdDailyPnl > 0 ? (meanDailyPnl / stdDailyPnl) * Math.sqrt(252) : 0;

    const avgDurationMs = closedTrades.length > 0
      ? closedTrades.reduce((sum: number, t: any) => {
          const opened = new Date(t.opened_at).getTime();
          const closed = new Date(t.closed_at).getTime();
          return sum + (closed - opened);
        }, 0) / closedTrades.length
      : 0;

    const now = new Date();
    const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const firstTradeDate = trades.length > 0 ? new Date(trades[0].opened_at) : null;
    const challengeStart = firstTradeDate && firstTradeDate > windowStart ? firstTradeDate : windowStart;
    const daysElapsed = Math.max(1, Math.ceil((now.getTime() - challengeStart.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyRate = closedTrades.length > 0 ? totalPnl / daysElapsed : 0;
    const remainingToTarget = targetUsd - totalPnl;
    const projectedDaysToTarget = dailyRate > 0 ? Math.ceil(remainingToTarget / dailyRate) : null;

    const portfolioResult = await pool.query(
      `SELECT * FROM mirdt_portfolio_state WHERE is_active = true ORDER BY created_at DESC LIMIT 1`
    );
    const portfolioConfig = portfolioResult.rows[0] || null;

    const runsResult = await pool.query(
      `SELECT id, run_type, started_at, finished_at, processed_count, 
              eligible_count, authorized_count, opened_count, failed_count, checksum
       FROM mirdt_execution_runs
       WHERE started_at >= NOW() - make_interval(days => $1)
       ORDER BY started_at DESC
       LIMIT 20`,
      [windowDays]
    );

    const auditTrail = closedTrades.map((t: any) => ({
      tradeId: t.id,
      setupId: t.setup_id,
      decisionId: t.decision_id,
      symbol: t.symbol || 'Unknown',
      assetType: t.asset_type || 'Unknown',
      direction: t.direction,
      grade: t.grade,
      entryTrigger: t.entry_trigger,
      policyMode: t.policy_mode,
      entryPrice: parseFloat(t.entry_price),
      exitPrice: parseFloat(t.exit_price || '0'),
      quantity: parseFloat(t.quantity),
      pnl: parseFloat(t.pnl || '0'),
      pnlPct: parseFloat(t.pnl_pct || '0'),
      outcome: t.outcome,
      exitReason: t.exit_reason,
      openedAt: t.opened_at,
      closedAt: t.closed_at,
      confidenceScore: t.confidence_score ? parseFloat(t.confidence_score) : null,
      signalZ: t.signal_z ? parseFloat(t.signal_z) : null,
      regimeTier: t.regime_tier,
      riskBudget: t.risk_budget_usd ? parseFloat(t.risk_budget_usd) : null,
      stopPrice: t.stop_price ? parseFloat(t.stop_price) : null,
      takeProfitP50: t.take_profit_p50 ? parseFloat(t.take_profit_p50) : null,
      takeProfitP95: t.take_profit_p95 ? parseFloat(t.take_profit_p95) : null,
    }));

    const pnlArray = closedTrades.map((t: any) => parseFloat(t.pnl || '0'));

    const metrics: PlaybookMetrics = {
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      openTrades: openTrades.length,
      wins: wins.length,
      losses: losses.length,
      flats: flats.length,
      winRate: closedTrades.length > 0 ? parseFloat((wins.length / closedTrades.length * 100).toFixed(1)) : 0,
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      avgPnlPerTrade: closedTrades.length > 0 ? parseFloat((totalPnl / closedTrades.length).toFixed(2)) : 0,
      avgWin: wins.length > 0 ? parseFloat((grossWins / wins.length).toFixed(2)) : 0,
      avgLoss: losses.length > 0 ? parseFloat((grossLosses / losses.length).toFixed(2)) : 0,
      profitFactor: grossLosses > 0 ? parseFloat((grossWins / grossLosses).toFixed(2)) : grossWins > 0 ? 999 : 0,
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      maxDrawdownPct: peak > 0 ? parseFloat((maxDrawdown / peak * 100).toFixed(1)) : 0,
      bestTrade: pnlArray.length > 0 ? parseFloat(Math.max(...pnlArray).toFixed(2)) : 0,
      worstTrade: pnlArray.length > 0 ? parseFloat(Math.min(...pnlArray).toFixed(2)) : 0,
      avgTradeDurationMinutes: parseFloat((avgDurationMs / 1000 / 60).toFixed(1)),
      sharpeEstimate: parseFloat(sharpeEstimate.toFixed(2)),
      targetUsd,
      targetDays,
      daysElapsed,
      progressPct: parseFloat(Math.min(100, (totalPnl / targetUsd) * 100).toFixed(1)),
      projectedDaysToTarget,
      onTrack: dailyRate >= (targetUsd / targetDays),
      startDate: challengeStart.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };

    return res.status(200).json({
      metrics,
      dailyAggregates,
      auditTrail,
      portfolioConfig,
      recentRuns: runsResult.rows,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[execution/playbook] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
