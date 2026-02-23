import { Pool } from 'pg';
import {
  computeRealizedPnl,
  computeUnrealizedPnl,
  computeFeesTotal,
  computeNetCapitalChange,
  computeReturnOnCapital,
  computeReturnOnDeployedCapital,
  computeDeployedCapital,
  computeCapitalEfficiencyScore,
  computeVarianceStabilityIndex,
  computeMaxDrawdown,
  computeRecoveryDuration,
  computeCapitalDrift,
  computeChecksum,
  getPeriodBounds,
  aggregateByDay,
  type PositionRecord,
  type FeeRecord,
} from './computeEngine';

interface SnapshotResult {
  snapshotId: string;
  asOf: string;
  checksum: string;
  metrics: Record<string, number>;
  warnings: string[];
  sourcesUsed: string[];
}

function getPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? true : undefined,
    max: 2,
  });
}

export async function ingestMirdtTrades(pool?: Pool): Promise<{ ingested: number; skipped: number }> {
  const p = pool ?? getPool();
  const shouldClose = !pool;
  let ingested = 0;
  let skipped = 0;

  try {
    const { rows: trades } = await p.query(`
      SELECT t.id, t.setup_id, t.opened_at, t.closed_at, t.entry_price,
             t.quantity, t.exit_price, t.pnl, t.outcome,
             s.symbol, s.entry_zone_low, s.invalidation_price,
             (SELECT d.direction FROM mirdt_execution_decisions d
              WHERE d.setup_id = t.setup_id
              ORDER BY d.created_at DESC LIMIT 1) as decision_direction
      FROM mirdt_paper_trades t
      JOIN mirdt_setups s ON s.id = t.setup_id
      ORDER BY t.opened_at ASC
    `);

    for (const t of trades) {
      const { rows: existing } = await p.query(
        `SELECT id FROM cap_positions WHERE mirdt_trade_id = $1 LIMIT 1`,
        [t.id]
      );
      if (existing.length > 0) {
        skipped++;
        continue;
      }

      let inferredDirection = 'LONG';
      if (t.decision_direction) {
        inferredDirection = t.decision_direction;
      } else if (t.invalidation_price && t.entry_zone_low) {
        inferredDirection = parseFloat(t.invalidation_price) < parseFloat(t.entry_zone_low) ? 'LONG' : 'SHORT';
      }
      const side = (inferredDirection === 'SHORT') ? 'SELL' : 'BUY';
      const status = t.closed_at ? 'CLOSED' : 'OPEN';
      const qty = parseFloat(t.quantity) || 1;
      const entryPrice = parseFloat(t.entry_price) || 0;
      const exitPrice = t.exit_price ? parseFloat(t.exit_price) : null;
      const pnl = t.pnl ? parseFloat(t.pnl) : null;

      const { rows: [pos] } = await p.query(`
        INSERT INTO cap_positions (instrument, venue, strategy_id, status, side, quantity, avg_entry_price, avg_exit_price, realized_pnl, opened_at, closed_at, mirdt_setup_id, mirdt_trade_id)
        VALUES ($1, 'PAPER', 'MIRDT', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [t.symbol || 'UNKNOWN', status, side, qty, entryPrice, exitPrice, pnl, t.opened_at, t.closed_at, t.setup_id, t.id]);

      await p.query(`
        INSERT INTO cap_trades (position_id, side, quantity, price, venue, executed_at, external_id)
        VALUES ($1, $2, $3, $4, 'PAPER', $5, $6)
      `, [pos.id, side, qty, entryPrice, t.opened_at, 'mirdt:entry:' + t.id]);

      if (status === 'CLOSED' && exitPrice !== null) {
        const exitSide = side === 'BUY' ? 'SELL' : 'BUY';
        await p.query(`
          INSERT INTO cap_trades (position_id, side, quantity, price, venue, executed_at, external_id)
          VALUES ($1, $2, $3, $4, 'PAPER', $5, $6)
        `, [pos.id, exitSide, qty, exitPrice, t.closed_at, 'mirdt:exit:' + t.id]);
      }

      ingested++;
    }
  } finally {
    if (shouldClose) await p.end();
  }

  return { ingested, skipped };
}

export async function createSnapshot(): Promise<SnapshotResult> {
  const p = getPool();
  const asOf = new Date().toISOString();
  const warnings: string[] = [];
  const sourcesUsed: string[] = [];

  try {
    await ingestMirdtTrades(p);
    sourcesUsed.push('MIRDT');

    const { rows: positions } = await p.query(`
      SELECT id, instrument, status, side, quantity, avg_entry_price, avg_exit_price, realized_pnl, opened_at, closed_at
      FROM cap_positions
    `);

    const posRecords: PositionRecord[] = positions.map(r => ({
      id: r.id,
      instrument: r.instrument,
      status: r.status,
      side: r.side,
      quantity: parseFloat(r.quantity) || 0,
      avgEntryPrice: parseFloat(r.avg_entry_price) || 0,
      avgExitPrice: r.avg_exit_price ? parseFloat(r.avg_exit_price) : null,
      realizedPnl: r.realized_pnl ? parseFloat(r.realized_pnl) : null,
      openedAt: r.opened_at?.toISOString?.() ?? r.opened_at,
      closedAt: r.closed_at?.toISOString?.() ?? r.closed_at ?? null,
    }));

    const { rows: fees } = await p.query(`SELECT id, amount, incurred_at FROM cap_fees`);
    const feeRecords: FeeRecord[] = fees.map(r => ({
      id: r.id,
      amount: parseFloat(r.amount) || 0,
      incurredAt: r.incurred_at?.toISOString?.() ?? r.incurred_at,
    }));

    const { rows: marks } = await p.query(`
      SELECT DISTINCT ON (instrument) instrument, price, marked_at
      FROM cap_price_marks ORDER BY instrument, marked_at DESC
    `);
    const latestMarks = new Map<string, number>();
    for (const m of marks) {
      latestMarks.set(m.instrument, parseFloat(m.price) || 0);
    }

    const openPositions = posRecords.filter(p => p.status === 'OPEN');
    const closedPositions = posRecords.filter(p => p.status === 'CLOSED');

    if (openPositions.length > 0 && latestMarks.size === 0) {
      warnings.push('No price marks available for open position valuation');
    }

    const realizedPnl = computeRealizedPnl(posRecords);
    const unrealizedPnl = computeUnrealizedPnl(openPositions, latestMarks);
    const feesTotal = computeFeesTotal(feeRecords);
    const netCapitalChange = computeNetCapitalChange(realizedPnl, unrealizedPnl, feesTotal);

    const { rows: acctRows } = await p.query(`
      SELECT COALESCE(SUM(debit_amount - credit_amount), 0) as balance
      FROM cap_ledger_entries
      JOIN cap_accounts ON cap_accounts.id = cap_ledger_entries.account_id
      WHERE cap_accounts.account_type = 'ASSET' AND cap_accounts.subtype = 'CASH'
    `);
    const cashBalance = parseFloat(acctRows[0]?.balance) || 750;

    const deployedCapital = computeDeployedCapital(openPositions);
    const totalCapital = cashBalance + deployedCapital;
    const returnOnCapital = computeReturnOnCapital(netCapitalChange, totalCapital);
    const returnOnDeployed = computeReturnOnDeployedCapital(netCapitalChange, deployedCapital);
    const utilization = totalCapital > 0 ? deployedCapital / totalCapital : 0;
    const efficiency = computeCapitalEfficiencyScore(returnOnDeployed, utilization);

    const closedTradesWithPnl = closedPositions
      .filter(p => p.realizedPnl !== null && p.closedAt)
      .map(p => ({ executedAt: p.closedAt as string, pnl: p.realizedPnl as number }));
    const dailyPnl = aggregateByDay(closedTradesWithPnl);
    const dailyReturns = Array.from(dailyPnl.values()).map(v => totalCapital > 0 ? v / totalCapital : 0);
    const vsi = computeVarianceStabilityIndex(dailyReturns);

    let cumulativePnl = 0;
    const equityCurve = Array.from(dailyPnl.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, pnl]) => {
        cumulativePnl += pnl;
        return { value: cashBalance + cumulativePnl, at: day + 'T23:59:59.999Z' };
      });

    if (equityCurve.length === 0) {
      equityCurve.push({ value: cashBalance, at: asOf });
    }

    const drawdown = computeMaxDrawdown(equityCurve);
    const recoveryDuration = computeRecoveryDuration(drawdown);

    const expectedValue = cashBalance;
    const actualValue = cashBalance + realizedPnl - feesTotal;
    const capitalDrift = computeCapitalDrift(expectedValue, actualValue);

    const { rows: sentinelRows } = await p.query(`
      SELECT regime_state FROM sentinel_signals ORDER BY created_at DESC LIMIT 1
    `).catch(() => ({ rows: [] }));
    const regimeBand = sentinelRows[0]?.regime_state ?? null;

    const { rows: policyRows } = await p.query(`
      SELECT current_policy_mode FROM gef_user_execution_profiles LIMIT 1
    `).catch(() => ({ rows: [] }));
    const policyState = policyRows[0]?.current_policy_mode ?? null;

    if (regimeBand) sourcesUsed.push('SENTINEL');
    if (policyState) sourcesUsed.push('GEF');

    const metricsMap: Record<string, number> = {
      realized_pnl: realizedPnl,
      unrealized_pnl: unrealizedPnl,
      fees_total: feesTotal,
      net_capital_change: netCapitalChange,
      return_on_capital: returnOnCapital,
      return_on_deployed_capital: returnOnDeployed,
      capital_efficiency_score: efficiency,
      variance_stability_index: vsi,
      max_drawdown: drawdown?.depthPct ?? 0,
      recovery_duration_ms: recoveryDuration ?? 0,
      capital_drift: capitalDrift,
      total_deployed: deployedCapital,
      total_capital: totalCapital,
      open_position_count: openPositions.length,
      closed_position_count: closedPositions.length,
      cash_balance: cashBalance,
    };

    const lines = Object.entries(metricsMap).map(([k, v]) => ({
      metricKey: k,
      metricValue: String(v),
      period: 'ALL',
      instrument: null,
    }));

    const periods: Array<'day' | 'week' | 'month' | 'year'> = ['day', 'week', 'month', 'year'];
    for (const period of periods) {
      const bounds = getPeriodBounds(period);
      const periodClosed = closedPositions.filter(p => {
        if (!p.closedAt) return false;
        const ts = new Date(p.closedAt).getTime();
        return ts >= new Date(bounds.start).getTime() && ts <= new Date(bounds.end).getTime();
      });
      const periodFees = feeRecords.filter(f => {
        const ts = new Date(f.incurredAt).getTime();
        return ts >= new Date(bounds.start).getTime() && ts <= new Date(bounds.end).getTime();
      });

      const pRealizedPnl = computeRealizedPnl(periodClosed);
      const pFeesTotal = computeFeesTotal(periodFees);
      const pNetChange = computeNetCapitalChange(pRealizedPnl, 0, pFeesTotal);

      lines.push(
        { metricKey: 'realized_pnl', metricValue: String(pRealizedPnl), period: period.toUpperCase(), instrument: null },
        { metricKey: 'fees_total', metricValue: String(pFeesTotal), period: period.toUpperCase(), instrument: null },
        { metricKey: 'net_capital_change', metricValue: String(pNetChange), period: period.toUpperCase(), instrument: null },
        { metricKey: 'closed_count', metricValue: String(periodClosed.length), period: period.toUpperCase(), instrument: null },
      );
    }

    const checksum = computeChecksum({ lines, sourcesUsed, asOf });
    const confidence = warnings.length === 0 ? 'HIGH' : 'MEDIUM';

    const { rows: [snap] } = await p.query(`
      INSERT INTO cap_snapshots (as_of, checksum, sources_used, confidence, warnings, regime_band, policy_state)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [asOf, checksum, JSON.stringify(sourcesUsed), confidence, JSON.stringify(warnings), regimeBand, policyState]);

    for (const line of lines) {
      await p.query(`
        INSERT INTO cap_snapshot_lines (snapshot_id, metric_key, metric_value, period, instrument)
        VALUES ($1, $2, $3, $4, $5)
      `, [snap.id, line.metricKey, line.metricValue, line.period, line.instrument]);
    }

    if (drawdown) {
      await p.query(`
        INSERT INTO cap_drawdowns (peak_value, trough_value, depth_pct, peak_at, trough_at, recovered_at, status, snapshot_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [drawdown.peakValue, drawdown.troughValue, drawdown.depthPct, drawdown.peakAt, drawdown.troughAt, drawdown.recoveredAt, drawdown.status, snap.id]);
    }

    await p.query(`
      INSERT INTO cap_drift_series (as_of, expected_value, actual_value, variance_pct, snapshot_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [asOf, expectedValue, actualValue, capitalDrift, snap.id]);

    await p.query(`
      INSERT INTO cap_decision_log (snapshot_id, action, rationale, metadata)
      VALUES ($1, $2, $3, $4)
    `, [snap.id, 'SNAPSHOT_CREATED', 'Automated capital accounting snapshot', JSON.stringify({
      positions_total: posRecords.length,
      open: openPositions.length,
      closed: closedPositions.length,
      sources: sourcesUsed,
    })]);

    return {
      snapshotId: snap.id,
      asOf,
      checksum,
      metrics: metricsMap,
      warnings,
      sourcesUsed,
    };
  } finally {
    await p.end();
  }
}

export async function getLatestSnapshot(): Promise<any | null> {
  const p = getPool();
  try {
    const { rows } = await p.query(`
      SELECT id, as_of, checksum, sources_used, confidence, warnings, regime_band, policy_state, created_at
      FROM cap_snapshots ORDER BY created_at DESC LIMIT 1
    `);
    if (rows.length === 0) return null;
    const snap = rows[0];

    const { rows: lines } = await p.query(`
      SELECT metric_key, metric_value, period, instrument
      FROM cap_snapshot_lines WHERE snapshot_id = $1
    `, [snap.id]);

    return { ...snap, lines };
  } finally {
    await p.end();
  }
}
