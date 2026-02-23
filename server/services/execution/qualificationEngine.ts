import { pool } from '../../db';
import { appendAuditEvent } from '../../audit/hashChain';

export interface QualificationInput {
  userId: string;
  walletAddress: string;
}

export interface BQEScores {
  rbar: number;
  dsi: number;
  psc: number;
  vrs: number;
  eds: number;
  rcs: number;
  eqs: number;
}

export interface QualificationResult {
  scores: BQEScores;
  currentTier: string;
  recommendedTier: string;
  tierChanged: boolean;
  disqualifiers: string[];
  paperDays: number;
  paperTradeCount: number;
  maxDrawdownPct: number;
  winRate: number;
  sharpeEstimate: number | null;
  axmBalance: number;
  axusdReserve: number;
  meetsAxmRequirement: boolean;
  meetsAxusdRequirement: boolean;
  snapshotId: string;
}

const EQS_WEIGHTS = {
  rbar: 0.25,
  dsi: 0.25,
  psc: 0.15,
  vrs: 0.15,
  eds: 0.10,
  rcs: 0.10,
};

function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}

async function fetchPaperTradeStats(userId: string, windowDays: number) {
  const trades = await pool.query(
    `SELECT t.entry_price, t.exit_price, t.pnl, t.pnl_pct, t.quantity,
            t.direction, t.outcome, t.opened_at, t.closed_at, t.mae, t.mfe
     FROM mirdt_paper_trades t
     JOIN mirdt_execution_decisions d ON t.decision_id = d.id
     WHERE t.status = 'CLOSED'
       AND t.closed_at >= NOW() - INTERVAL '1 day' * $1
     ORDER BY t.closed_at ASC`,
    [windowDays]
  );

  const gef = await pool.query(
    `SELECT e.filled_price, e.close_price, e.pnl_axusd, e.pnl_pct,
            e.filled_qty, e.max_adverse_excursion, e.max_favorable_excursion,
            e.opened_at, e.closed_at, e.close_reason,
            i.direction, i.risk_budget_axusd, i.stop_distance, i.position_size
     FROM gef_executions e
     JOIN gef_execution_intents i ON e.intent_id = i.intent_id
     WHERE i.user_id = $1
       AND e.closed_at IS NOT NULL
       AND e.closed_at >= NOW() - INTERVAL '1 day' * $2
     ORDER BY e.closed_at ASC`,
    [userId, windowDays]
  );

  return { mirdtTrades: trades.rows, gefTrades: gef.rows };
}

function computeRBAR(trades: any[]): number {
  if (trades.length === 0) return 0;
  let adherent = 0;
  for (const t of trades) {
    const pnl = safeNum(t.pnl ?? t.pnl_axusd);
    const riskBudget = safeNum(t.risk_budget_axusd, 100);
    if (riskBudget > 0 && Math.abs(pnl) <= riskBudget * 1.5) {
      adherent++;
    }
  }
  return adherent / trades.length;
}

function computeDSI(trades: any[]): number {
  if (trades.length < 2) return 0.5;
  const pnls = trades.map((t: any) => safeNum(t.pnl ?? t.pnl_axusd));
  let peak = 0;
  let cumulative = 0;
  let maxDrawdown = 0;
  const drawdowns: number[] = [];

  for (const pnl of pnls) {
    cumulative += pnl;
    if (cumulative > peak) peak = cumulative;
    const dd = peak > 0 ? (peak - cumulative) / peak : 0;
    drawdowns.push(dd);
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  if (maxDrawdown === 0) return 1.0;
  const avgDd = drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length;
  const stability = 1 - Math.min(avgDd / 0.10, 1);
  return Math.max(0, Math.min(1, stability));
}

function computePSC(trades: any[]): number {
  if (trades.length < 3) return 0.5;
  const sizes = trades.map((t: any) => safeNum(t.quantity ?? t.filled_qty ?? t.position_size));
  const validSizes = sizes.filter((s: number) => s > 0);
  if (validSizes.length < 3) return 0.5;

  const mean = validSizes.reduce((a: number, b: number) => a + b, 0) / validSizes.length;
  if (mean === 0) return 0;
  const variance = validSizes.reduce((acc: number, s: number) => acc + Math.pow(s - mean, 2), 0) / validSizes.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.min(1, 1 - cv));
}

function computeVRS(trades: any[]): number {
  if (trades.length < 5) return 0.5;
  const sizes = trades.map((t: any) => safeNum(t.quantity ?? t.filled_qty ?? t.position_size));
  let jumpCount = 0;
  for (let i = 1; i < sizes.length; i++) {
    if (sizes[i - 1] > 0) {
      const change = Math.abs(sizes[i] - sizes[i - 1]) / sizes[i - 1];
      if (change > 0.5) jumpCount++;
    }
  }
  const jumpRate = jumpCount / (sizes.length - 1);
  return Math.max(0, Math.min(1, 1 - jumpRate * 2));
}

function computeEDS(trades: any[]): number {
  if (trades.length === 0) return 0.5;
  const mae = trades.map((t: any) => safeNum(t.mae ?? t.max_adverse_excursion));
  const riskBudgets = trades.map((t: any) => safeNum(t.risk_budget_axusd, 100));
  let disciplined = 0;
  for (let i = 0; i < trades.length; i++) {
    if (riskBudgets[i] > 0 && mae[i] <= riskBudgets[i]) {
      disciplined++;
    }
  }
  return disciplined / trades.length;
}

function computeRCS(trades: any[]): number {
  if (trades.length === 0) return 1.0;
  let compliant = 0;
  for (const t of trades) {
    const hasStop = safeNum(t.stop_price ?? t.stop_distance) > 0;
    const hasEntry = safeNum(t.entry_price ?? t.filled_price) > 0;
    if (hasStop && hasEntry) compliant++;
  }
  return compliant / trades.length;
}

function computeEQS(scores: Omit<BQEScores, 'eqs'>): number {
  return (
    scores.rbar * EQS_WEIGHTS.rbar +
    scores.dsi * EQS_WEIGHTS.dsi +
    scores.psc * EQS_WEIGHTS.psc +
    scores.vrs * EQS_WEIGHTS.vrs +
    scores.eds * EQS_WEIGHTS.eds +
    scores.rcs * EQS_WEIGHTS.rcs
  );
}

function computeMaxDrawdownPct(trades: any[]): number {
  if (trades.length === 0) return 0;
  const pnls = trades.map((t: any) => safeNum(t.pnl ?? t.pnl_axusd));
  let peak = 0;
  let cumulative = 0;
  let maxDd = 0;
  for (const pnl of pnls) {
    cumulative += pnl;
    if (cumulative > peak) peak = cumulative;
    if (peak > 0) {
      const dd = (peak - cumulative) / peak;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return maxDd;
}

function computeWinRate(trades: any[]): number {
  if (trades.length === 0) return 0;
  const wins = trades.filter((t: any) => safeNum(t.pnl ?? t.pnl_axusd) > 0).length;
  return wins / trades.length;
}

function computeSharpe(trades: any[]): number | null {
  if (trades.length < 10) return null;
  const returns = trades.map((t: any) => safeNum(t.pnl_pct));
  const mean = returns.reduce((a: number, b: number) => a + b, 0) / returns.length;
  const variance = returns.reduce((acc: number, r: number) => acc + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return null;
  return (mean / stdDev) * Math.sqrt(252);
}

async function determineTier(
  eqs: number,
  paperDays: number,
  tradeCount: number,
  maxDrawdownPct: number,
  sharpe: number | null,
  axmBalance: number,
  axusdReserve: number
): Promise<{ tierId: string; disqualifiers: string[] }> {
  const tiers = await pool.query(
    `SELECT * FROM gef_tier_thresholds ORDER BY min_qualification_score DESC`
  );

  for (const tier of tiers.rows) {
    const disqualifiers: string[] = [];

    if (eqs < safeNum(tier.min_qualification_score)) {
      disqualifiers.push(`EQS ${eqs.toFixed(3)} below ${tier.name} threshold ${tier.min_qualification_score}`);
    }
    if (paperDays < tier.min_days_paper) {
      disqualifiers.push(`${paperDays} paper days below ${tier.min_days_paper} required for ${tier.name}`);
    }
    if (tradeCount < tier.min_trades_paper) {
      disqualifiers.push(`${tradeCount} trades below ${tier.min_trades_paper} required for ${tier.name}`);
    }
    if (maxDrawdownPct > safeNum(tier.max_drawdown_paper)) {
      disqualifiers.push(`Drawdown ${(maxDrawdownPct * 100).toFixed(1)}% exceeds ${tier.name} limit ${(safeNum(tier.max_drawdown_paper) * 100).toFixed(1)}%`);
    }
    if (tier.min_sharpe !== null && sharpe !== null && sharpe < safeNum(tier.min_sharpe)) {
      disqualifiers.push(`Sharpe ${sharpe.toFixed(2)} below ${tier.name} minimum ${tier.min_sharpe}`);
    }
    if (tier.requires_axm_commitment && axmBalance < safeNum(tier.min_axm_balance)) {
      disqualifiers.push(`AXM balance ${axmBalance} below ${tier.name} commitment of ${tier.min_axm_balance}`);
    }
    if (tier.requires_axusd_reserve && axusdReserve < safeNum(tier.min_axusd_reserve)) {
      disqualifiers.push(`AXUSD reserve ${axusdReserve} below ${tier.name} requirement of ${tier.min_axusd_reserve}`);
    }

    if (disqualifiers.length === 0) {
      return { tierId: tier.tier_id, disqualifiers: [] };
    }

    if (tier.tier_id === 'PAPER') {
      return { tierId: 'PAPER', disqualifiers };
    }
  }

  return { tierId: 'PAPER', disqualifiers: ['Does not meet any tier requirements'] };
}

export async function computeQualification(input: QualificationInput): Promise<QualificationResult> {
  const profileResult = await pool.query(
    `SELECT * FROM gef_user_execution_profiles WHERE user_id = $1`,
    [input.userId]
  );

  let profile = profileResult.rows[0];
  if (!profile) {
    const insert = await pool.query(
      `INSERT INTO gef_user_execution_profiles (user_id, wallet_address, paper_start_date)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO NOTHING
       RETURNING *`,
      [input.userId, input.walletAddress]
    );
    profile = insert.rows[0];
    if (!profile) {
      const refetch = await pool.query(
        `SELECT * FROM gef_user_execution_profiles WHERE user_id = $1`, [input.userId]
      );
      profile = refetch.rows[0];
    }
  }

  const windowDays = 90;
  const { mirdtTrades, gefTrades } = await fetchPaperTradeStats(input.userId, windowDays);
  const allTrades = [...mirdtTrades, ...gefTrades];

  const paperStartDate = profile.paper_start_date ? new Date(profile.paper_start_date) : new Date();
  const paperDays = Math.floor((Date.now() - paperStartDate.getTime()) / (1000 * 60 * 60 * 24));

  const rbar = computeRBAR(allTrades);
  const dsi = computeDSI(allTrades);
  const psc = computePSC(allTrades);
  const vrs = computeVRS(allTrades);
  const eds = computeEDS(allTrades);
  const rcs = computeRCS(allTrades);
  const eqs = computeEQS({ rbar, dsi, psc, vrs, eds, rcs });

  const maxDrawdownPct = computeMaxDrawdownPct(allTrades);
  const winRate = computeWinRate(allTrades);
  const sharpeEstimate = computeSharpe(allTrades);

  const axmBalance = safeNum(profile.axm_balance);
  const axusdReserve = safeNum(profile.axusd_reserve_balance);

  const { tierId: recommendedTier, disqualifiers } = await determineTier(
    eqs, paperDays, allTrades.length, maxDrawdownPct, sharpeEstimate,
    axmBalance, axusdReserve
  );

  const currentTier = profile.current_tier_id;
  const tierChanged = recommendedTier !== currentTier;

  const tierInfo = await pool.query(
    `SELECT * FROM gef_tier_thresholds WHERE tier_id = $1`, [recommendedTier]
  );
  const tierRow = tierInfo.rows[0];
  const meetsAxm = !tierRow?.requires_axm_commitment || axmBalance >= safeNum(tierRow.min_axm_balance);
  const meetsAxusd = !tierRow?.requires_axusd_reserve || axusdReserve >= safeNum(tierRow.min_axusd_reserve);

  await pool.query(
    `UPDATE gef_user_execution_profiles SET
      last_qualification_score = $1,
      paper_trade_count = $2,
      paper_win_rate = $3,
      paper_max_drawdown = $4,
      paper_sharpe = $5,
      current_tier_id = $6,
      live_enabled = $7,
      updated_at = NOW()
     WHERE user_id = $8`,
    [
      eqs,
      allTrades.length,
      winRate,
      maxDrawdownPct,
      sharpeEstimate,
      recommendedTier,
      tierRow?.execution_enabled && disqualifiers.length === 0 && meetsAxm && meetsAxusd,
      input.userId,
    ]
  );

  const snapshotResult = await pool.query(
    `INSERT INTO gef_qualification_snapshots
      (user_id, window_start, window_end, rbar, dsi, psc, vrs, eds, rcs, eqs,
       max_drawdown_pct, trade_count, win_rate, sharpe_estimate,
       axm_balance, axusd_reserve, tier_result, disqualifiers)
     VALUES ($1, NOW() - INTERVAL '1 day' * $2, NOW(), $3, $4, $5, $6, $7, $8, $9,
       $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING id`,
    [
      input.userId, windowDays,
      rbar, dsi, psc, vrs, eds, rcs, eqs,
      maxDrawdownPct, allTrades.length, winRate, sharpeEstimate,
      axmBalance, axusdReserve, recommendedTier,
      JSON.stringify(disqualifiers),
    ]
  );

  const snapshotId = snapshotResult.rows[0].id;

  await appendAuditEvent('USER', input.userId, 'QUALIFICATION_COMPUTED', {
    snapshotId,
    eqs,
    recommendedTier,
    previousTier: currentTier,
    tierChanged,
    disqualifiers,
    paperDays,
    tradeCount: allTrades.length,
  });

  return {
    scores: { rbar, dsi, psc, vrs, eds, rcs, eqs },
    currentTier,
    recommendedTier,
    tierChanged,
    disqualifiers,
    paperDays,
    paperTradeCount: allTrades.length,
    maxDrawdownPct,
    winRate,
    sharpeEstimate,
    axmBalance,
    axusdReserve,
    meetsAxmRequirement: meetsAxm,
    meetsAxusdRequirement: meetsAxusd,
    snapshotId,
  };
}
