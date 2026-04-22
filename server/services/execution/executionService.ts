import { pool } from '../../db';
import { appendAuditEventInTransaction, appendAuditEvent } from '../../audit/hashChain';

function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}

export interface ExecutePaperResult {
  success: boolean;
  executionId?: string;
  error?: string;
}

export interface CloseExecutionResult {
  success: boolean;
  pnlAxusd?: number;
  pnlPct?: number;
  mae?: number;
  mfe?: number;
  error?: string;
}

export async function executePaper(intentId: string): Promise<ExecutePaperResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const intentResult = await client.query(
      `SELECT i.*, p.live_enabled, p.execution_suspended
       FROM gef_execution_intents i
       JOIN gef_user_execution_profiles p ON i.user_id = p.user_id
       WHERE i.intent_id = $1`,
      [intentId]
    );

    if (intentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Intent not found' };
    }

    const intent = intentResult.rows[0];

    if (intent.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return { success: false, error: `Intent status is ${intent.status}, expected PENDING` };
    }

    if (intent.is_live) {
      await client.query('ROLLBACK');
      return { success: false, error: 'This intent is marked for live execution. Use execute-live endpoint.' };
    }

    if (intent.execution_suspended) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Execution is suspended for this account' };
    }

    const existingExec = await client.query(
      `SELECT execution_id FROM gef_executions WHERE intent_id = $1`,
      [intentId]
    );
    if (existingExec.rows.length > 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Execution already exists for this intent' };
    }

    const filledPrice = safeNum(intent.entry_price);
    const filledQty = safeNum(intent.position_size);

    if (filledPrice <= 0 || filledQty <= 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Invalid entry price or position size on intent' };
    }

    const execResult = await client.query(
      `INSERT INTO gef_executions
        (intent_id, filled_price, filled_qty, fees_paid, slippage_estimate)
       VALUES ($1, $2, $3, 0, 0)
       RETURNING execution_id`,
      [intentId, filledPrice, filledQty]
    );

    const executionId = execResult.rows[0].execution_id;

    await client.query(
      `UPDATE gef_execution_intents SET status = 'OPEN' WHERE intent_id = $1`,
      [intentId]
    );

    await appendAuditEventInTransaction(client, 'EXECUTION', executionId, 'EXECUTION_OPENED_PAPER', {
      intentId,
      userId: intent.user_id,
      symbol: intent.symbol,
      direction: intent.direction,
      filledPrice,
      filledQty,
      mode: 'PAPER',
    });

    await client.query('COMMIT');
    return { success: true, executionId };
  } catch (err: any) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function closeExecution(
  executionId: string,
  closePrice?: number,
  closeReason?: string
): Promise<CloseExecutionResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const execResult = await client.query(
      `SELECT e.*, i.direction, i.user_id, i.symbol, i.is_live, i.intent_id,
              i.stop_price, i.entry_price as intent_entry_price
       FROM gef_executions e
       JOIN gef_execution_intents i ON e.intent_id = i.intent_id
       WHERE e.execution_id = $1`,
      [executionId]
    );

    if (execResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Execution not found' };
    }

    const exec = execResult.rows[0];

    if (exec.closed_at !== null) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Execution already closed' };
    }

    const filledPrice = safeNum(exec.filled_price);
    const filledQty = safeNum(exec.filled_qty);
    const direction = exec.direction;
    const finalClosePrice = closePrice ?? filledPrice;

    if (filledPrice <= 0 || filledQty <= 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Invalid filled price or quantity on execution record' };
    }

    const pnlAxusd = direction === 'LONG'
      ? (finalClosePrice - filledPrice) * filledQty
      : (filledPrice - finalClosePrice) * filledQty;

    const pnlPct = filledPrice > 0
      ? ((finalClosePrice - filledPrice) / filledPrice) * 100 * (direction === 'SHORT' ? -1 : 1)
      : 0;

    const mae = safeNum(exec.max_adverse_excursion);
    const mfe = safeNum(exec.max_favorable_excursion);

    const finalMae = direction === 'LONG'
      ? Math.max(mae, filledPrice - finalClosePrice > 0 ? (filledPrice - finalClosePrice) * filledQty : 0)
      : Math.max(mae, finalClosePrice - filledPrice > 0 ? (finalClosePrice - filledPrice) * filledQty : 0);

    const finalMfe = direction === 'LONG'
      ? Math.max(mfe, finalClosePrice - filledPrice > 0 ? (finalClosePrice - filledPrice) * filledQty : 0)
      : Math.max(mfe, filledPrice - finalClosePrice > 0 ? (filledPrice - finalClosePrice) * filledQty : 0);

    const reason = closeReason || 'MANUAL_CLOSE';

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
      [finalClosePrice, pnlAxusd, pnlPct, finalMae, finalMfe, reason, executionId]
    );

    await client.query(
      `UPDATE gef_execution_intents SET status = 'CLOSED' WHERE intent_id = $1`,
      [exec.intent_id]
    );

    if (!exec.is_live) {
      await updatePaperMetrics(client, exec.user_id);
    }

    await appendAuditEventInTransaction(client, 'EXECUTION', executionId, 'EXECUTION_CLOSED', {
      intentId: exec.intent_id,
      userId: exec.user_id,
      symbol: exec.symbol,
      direction,
      filledPrice,
      closePrice: finalClosePrice,
      pnlAxusd,
      pnlPct,
      mae: finalMae,
      mfe: finalMfe,
      closeReason: reason,
      mode: exec.is_live ? 'LIVE' : 'PAPER',
    });

    await client.query('COMMIT');
    return { success: true, pnlAxusd, pnlPct, mae: finalMae, mfe: finalMfe };
  } catch (err: any) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updatePaperMetrics(client: any, userId: string): Promise<void> {
  const trades = await client.query(
    `SELECT e.pnl_axusd, e.pnl_pct
     FROM gef_executions e
     JOIN gef_execution_intents i ON e.intent_id = i.intent_id
     WHERE i.user_id = $1 AND e.closed_at IS NOT NULL AND i.is_live = false
     ORDER BY e.closed_at ASC`,
    [userId]
  );

  const rows = trades.rows;
  const count = rows.length;
  if (count === 0) return;

  const wins = rows.filter((r: any) => safeNum(r.pnl_axusd) > 0).length;
  const winRate = wins / count;
  const totalPnl = rows.reduce((acc: number, r: any) => acc + safeNum(r.pnl_axusd), 0);

  let peak = 0;
  let cumulative = 0;
  let maxDrawdown = 0;
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
    [count, winRate, totalPnl, maxDrawdown, sharpe, userId]
  );
}

export async function getExecutionsByUser(
  userId: string,
  page = 1,
  limit = 20,
  status?: string
): Promise<{ executions: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const offset = (page - 1) * limit;
  const params: any[] = [userId];
  let whereClause = 'WHERE i.user_id = $1';
  let paramIdx = 2;

  if (status) {
    whereClause += ` AND i.status = $${paramIdx++}`;
    params.push(status);
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM gef_executions e
     JOIN gef_execution_intents i ON e.intent_id = i.intent_id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await pool.query(
    `SELECT e.*, i.symbol, i.asset_class, i.direction, i.is_live, i.status as intent_status,
            i.risk_budget_axusd, i.stop_price, i.take_profit_price
     FROM gef_executions e
     JOIN gef_execution_intents i ON e.intent_id = i.intent_id
     ${whereClause}
     ORDER BY e.opened_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return {
    executions: result.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getIntentsByUser(
  userId: string,
  page = 1,
  limit = 20,
  status?: string
): Promise<{ intents: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const offset = (page - 1) * limit;
  const params: any[] = [userId];
  let whereClause = 'WHERE user_id = $1';
  let paramIdx = 2;

  if (status) {
    whereClause += ` AND status = $${paramIdx++}`;
    params.push(status);
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM gef_execution_intents ${whereClause}`, params
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await pool.query(
    `SELECT * FROM gef_execution_intents ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return {
    intents: result.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
