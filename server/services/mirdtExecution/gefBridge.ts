import { pool } from '../../db';
import { appendAuditEvent } from '../../audit/hashChain';

const FOUNDER_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const FOUNDER_WALLET = '0xFounderTestWallet001';

function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}

export async function ensureFounderProfile(): Promise<string> {
  const existing = await pool.query(
    `SELECT user_id FROM gef_user_execution_profiles WHERE user_id = $1`,
    [FOUNDER_USER_ID]
  );
  if (existing.rows.length > 0) return FOUNDER_USER_ID;

  await pool.query(
    `INSERT INTO gef_user_execution_profiles (user_id, wallet_address, paper_start_date)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO NOTHING`,
    [FOUNDER_USER_ID, FOUNDER_WALLET]
  );
  return FOUNDER_USER_ID;
}

export async function bridgeTradeOpen(
  mirdtTradeId: string,
  decision: {
    setup_id: string;
    symbol: string;
    asset_type: string;
    direction: string;
    current_price: number;
    position_size_qty: number;
    stop_price: number;
    take_profit_p50: number;
    take_profit_p95: number;
    risk_budget_usd: number;
    invalidation_distance: number;
    policy_mode: string;
  }
): Promise<{ intentId: string; executionId: string } | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = await ensureFounderProfile();

    const entryPrice = safeNum(decision.current_price);
    const stopPrice = safeNum(decision.stop_price);
    const stopDistance = Math.abs(entryPrice - stopPrice);
    const positionSize = safeNum(decision.position_size_qty);
    const riskBudget = safeNum(decision.risk_budget_usd);

    if (entryPrice <= 0 || positionSize <= 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const intentResult = await client.query(
      `INSERT INTO gef_execution_intents
        (user_id, symbol, asset_class, signal_id, regime_id, policy_mode,
         direction, entry_price, stop_price, take_profit_price, invalidation_price,
         stop_distance, risk_budget_axusd, position_size, is_live, status)
       VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, $9, NULL, $10, $11, $12, false, 'OPEN')
       RETURNING intent_id`,
      [
        userId,
        decision.symbol,
        decision.asset_type === 'CRYPTO' ? 'DIGITAL_ASSET' : 'EQUITY',
        decision.setup_id,
        decision.policy_mode || 'BOOTSTRAP',
        decision.direction,
        entryPrice,
        stopPrice,
        safeNum(decision.take_profit_p50) || null,
        stopDistance,
        riskBudget,
        positionSize,
      ]
    );
    const intentId = intentResult.rows[0].intent_id;

    const execResult = await client.query(
      `INSERT INTO gef_executions
        (intent_id, filled_price, filled_qty, fees_paid, slippage_estimate)
       VALUES ($1, $2, $3, 0, 0)
       RETURNING execution_id`,
      [intentId, entryPrice, positionSize]
    );
    const executionId = execResult.rows[0].execution_id;

    await appendAuditEvent('EXECUTION', executionId, 'MIRDT_BRIDGE_OPENED', {
      mirdtTradeId,
      intentId,
      userId,
      symbol: decision.symbol,
      direction: decision.direction,
      entryPrice,
      positionSize,
      source: 'MIRDT_PAPER_TRADE',
    });

    await client.query('COMMIT');
    console.log(`[GEF-Bridge] Opened: MIRDT trade ${mirdtTradeId} → GEF intent ${intentId}, execution ${executionId}`);
    return { intentId, executionId };
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error(`[GEF-Bridge] Failed to bridge trade open for ${mirdtTradeId}:`, err.message);
    return null;
  } finally {
    client.release();
  }
}

export async function bridgeTradeClose(
  mirdtTradeId: string,
  exitPrice: number,
  exitReason: string,
  pnl: number,
  pnlPct: number,
  direction: string
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const bridged = await client.query(
      `SELECT e.execution_id, e.filled_price, e.filled_qty, e.closed_at,
              i.intent_id, i.user_id, i.symbol, i.direction
       FROM gef_execution_intents i
       JOIN gef_executions e ON e.intent_id = i.intent_id
       WHERE i.signal_id = (
         SELECT setup_id FROM mirdt_paper_trades WHERE id = $1
       )
       AND i.user_id = $2
       AND e.closed_at IS NULL
       ORDER BY e.opened_at DESC
       LIMIT 1`,
      [mirdtTradeId, FOUNDER_USER_ID]
    );

    if (bridged.rows.length === 0) {
      await client.query('ROLLBACK');
      console.warn(`[GEF-Bridge] No open GEF execution found for MIRDT trade ${mirdtTradeId}`);
      return false;
    }

    const exec = bridged.rows[0];
    const filledPrice = safeNum(exec.filled_price);
    const filledQty = safeNum(exec.filled_qty);

    const mae = direction === 'LONG'
      ? Math.max(0, filledPrice - exitPrice > 0 ? (filledPrice - exitPrice) * filledQty : 0)
      : Math.max(0, exitPrice - filledPrice > 0 ? (exitPrice - filledPrice) * filledQty : 0);

    const mfe = direction === 'LONG'
      ? Math.max(0, exitPrice - filledPrice > 0 ? (exitPrice - filledPrice) * filledQty : 0)
      : Math.max(0, filledPrice - exitPrice > 0 ? (filledPrice - exitPrice) * filledQty : 0);

    await client.query(
      `UPDATE gef_executions SET
        closed_at = NOW(),
        close_price = $1,
        pnl_axusd = $2,
        pnl_pct = $3,
        max_adverse_excursion = $4,
        max_favorable_excursion = $5,
        close_reason = $6
       WHERE execution_id = $7`,
      [exitPrice, pnl, pnlPct, mae, mfe, exitReason, exec.execution_id]
    );

    await client.query(
      `UPDATE gef_execution_intents SET status = 'CLOSED' WHERE intent_id = $1`,
      [exec.intent_id]
    );

    const trades = await client.query(
      `SELECT e.pnl_axusd, e.pnl_pct
       FROM gef_executions e
       JOIN gef_execution_intents i ON e.intent_id = i.intent_id
       WHERE i.user_id = $1 AND e.closed_at IS NOT NULL AND i.is_live = false
       ORDER BY e.closed_at ASC`,
      [FOUNDER_USER_ID]
    );

    const rows = trades.rows;
    const count = rows.length;
    if (count > 0) {
      const wins = rows.filter((r: any) => safeNum(r.pnl_axusd) > 0).length;
      const winRate = wins / count;
      const totalPnl = rows.reduce((acc: number, r: any) => acc + safeNum(r.pnl_axusd), 0);

      let peak = 0, cumulative = 0, maxDrawdown = 0;
      for (const r of rows) {
        cumulative += safeNum(r.pnl_axusd);
        if (cumulative > peak) peak = cumulative;
        if (peak > 0) {
          const dd = (peak - cumulative) / peak;
          if (dd > maxDrawdown) maxDrawdown = dd;
        }
      }

      let sharpe: number | null = null;
      if (count >= 10) {
        const returns = rows.map((r: any) => safeNum(r.pnl_pct));
        const mean = returns.reduce((a: number, b: number) => a + b, 0) / count;
        const variance = returns.reduce((acc: number, r: number) => acc + Math.pow(r - mean, 2), 0) / count;
        const stdDev = Math.sqrt(variance);
        if (stdDev > 0) sharpe = (mean / stdDev) * Math.sqrt(252);
      }

      await client.query(
        `UPDATE gef_user_execution_profiles SET
          paper_trade_count = $1,
          paper_win_rate = $2,
          paper_pnl_axusd = $3,
          paper_max_drawdown = $4,
          paper_sharpe = $5,
          updated_at = NOW()
         WHERE user_id = $6`,
        [count, winRate, totalPnl, maxDrawdown, sharpe, FOUNDER_USER_ID]
      );
    }

    await appendAuditEvent('EXECUTION', exec.execution_id, 'MIRDT_BRIDGE_CLOSED', {
      mirdtTradeId,
      intentId: exec.intent_id,
      userId: FOUNDER_USER_ID,
      symbol: exec.symbol,
      exitPrice,
      pnl,
      pnlPct,
      exitReason,
      source: 'MIRDT_PAPER_TRADE',
    });

    await client.query('COMMIT');
    console.log(`[GEF-Bridge] Closed: MIRDT trade ${mirdtTradeId} → GEF execution ${exec.execution_id}, P&L: ${pnl.toFixed(2)}`);
    return true;
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error(`[GEF-Bridge] Failed to bridge trade close for ${mirdtTradeId}:`, err.message);
    return false;
  } finally {
    client.release();
  }
}

export async function getFounderQualificationSnapshot(): Promise<any> {
  const profile = await pool.query(
    `SELECT * FROM gef_user_execution_profiles WHERE user_id = $1`,
    [FOUNDER_USER_ID]
  );
  if (profile.rows.length === 0) return null;

  const p = profile.rows[0];

  const latestSnapshot = await pool.query(
    `SELECT * FROM gef_qualification_snapshots
     WHERE user_id = $1
     ORDER BY computed_at DESC LIMIT 1`,
    [FOUNDER_USER_ID]
  );

  const openGefTrades = await pool.query(
    `SELECT COUNT(*) as cnt FROM gef_execution_intents
     WHERE user_id = $1 AND status = 'OPEN'`,
    [FOUNDER_USER_ID]
  );

  const closedGefTrades = await pool.query(
    `SELECT COUNT(*) as cnt FROM gef_executions e
     JOIN gef_execution_intents i ON e.intent_id = i.intent_id
     WHERE i.user_id = $1 AND e.closed_at IS NOT NULL`,
    [FOUNDER_USER_ID]
  );

  const snapshot = latestSnapshot.rows[0] || null;

  return {
    userId: FOUNDER_USER_ID,
    wallet: p.wallet_address,
    currentTier: p.current_tier_id,
    policyMode: p.current_policy_mode,
    eqs: safeNum(p.last_qualification_score),
    paperTradeCount: safeNum(p.paper_trade_count),
    paperWinRate: safeNum(p.paper_win_rate),
    paperMaxDrawdown: safeNum(p.paper_max_drawdown),
    paperSharpe: p.paper_sharpe !== null ? safeNum(p.paper_sharpe) : null,
    paperPnlAxusd: safeNum(p.paper_pnl_axusd),
    liveEnabled: p.live_enabled,
    axmBalance: safeNum(p.axm_balance),
    axusdReserve: safeNum(p.axusd_reserve_balance),
    paperStartDate: p.paper_start_date,
    openGefTrades: safeNum(openGefTrades.rows[0].cnt),
    closedGefTrades: safeNum(closedGefTrades.rows[0].cnt),
    latestBqe: snapshot ? {
      rbar: safeNum(snapshot.rbar),
      dsi: safeNum(snapshot.dsi),
      psc: safeNum(snapshot.psc),
      vrs: safeNum(snapshot.vrs),
      eds: safeNum(snapshot.eds),
      rcs: safeNum(snapshot.rcs),
      eqs: safeNum(snapshot.eqs),
      tierResult: snapshot.tier_result,
      computedAt: snapshot.computed_at,
    } : null,
  };
}

export function getFounderUserId(): string {
  return FOUNDER_USER_ID;
}
