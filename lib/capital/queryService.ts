import { Pool } from 'pg';
import {
  computeRealizedPnl,
  computeUnrealizedPnl,
  computeFeesTotal,
  computeNetCapitalChange,
  computeReturnOnCapital,
  computeReturnOnDeployedCapital,
  computeDeployedCapital,
  computeMaxDrawdown,
  computeCapitalDrift,
  getPeriodBounds,
  aggregateByDay,
  type PositionRecord,
  type FeeRecord,
} from './computeEngine';

function getPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? true : undefined,
    max: 2,
  });
}

export async function getCapitalState() {
  const p = getPool();
  try {
    const { rows: positions } = await p.query(`
      SELECT id, instrument, status, side, quantity, avg_entry_price, realized_pnl
      FROM cap_trading_positions
    `);

    const open = positions.filter(r => r.status === 'OPEN');
    const closed = positions.filter(r => r.status === 'CLOSED');
    const totalRealized = closed.reduce((s, r) => s + (parseFloat(r.realized_pnl) || 0), 0);

    const { rows: snapRows } = await p.query(`
      SELECT as_of, created_at FROM cap_snapshots ORDER BY created_at DESC LIMIT 1
    `);
    const lastSnapshot = snapRows[0] ?? null;
    const snapshotAgeMs = lastSnapshot ? Date.now() - new Date(lastSnapshot.created_at).getTime() : null;

    const { rows: balRows } = await p.query(`
      SELECT COALESCE(SUM(debit_amount - credit_amount), 0) as balance
      FROM cap_ledger_entries
      JOIN cap_accounts ON cap_accounts.id = cap_ledger_entries.account_id
      WHERE cap_accounts.account_type = 'ASSET' AND cap_accounts.subtype = 'CASH'
    `);
    const cashBalance = parseFloat(balRows[0]?.balance) || 750;

    return {
      cashBalance,
      openPositionCount: open.length,
      closedPositionCount: closed.length,
      totalRealizedPnl: totalRealized,
      lastSnapshotAt: lastSnapshot?.as_of ?? null,
      snapshotAgeMs,
    };
  } finally {
    await p.end();
  }
}

export async function getPerformanceMetrics(period: 'day' | 'week' | 'month' | 'year', anchor?: string) {
  const p = getPool();
  try {
    const bounds = getPeriodBounds(period, anchor);
    const warnings: string[] = [];

    const { rows: allPositions } = await p.query(`
      SELECT id, instrument, status, side, quantity, avg_entry_price, avg_exit_price, realized_pnl, opened_at, closed_at
      FROM cap_trading_positions
    `);

    const posRecords: PositionRecord[] = allPositions.map(r => ({
      id: r.id,
      instrument: r.instrument,
      status: r.status,
      side: r.side,
      quantity: parseFloat(r.quantity) || 0,
      avgEntryPrice: parseFloat(r.avg_entry_price) || 0,
      avgExitPrice: r.avg_exit_price ? parseFloat(r.avg_exit_price) : null,
      realizedPnl: r.realized_pnl ? parseFloat(r.realized_pnl) : null,
      openedAt: r.opened_at?.toISOString?.() ?? String(r.opened_at),
      closedAt: r.closed_at ? (r.closed_at?.toISOString?.() ?? String(r.closed_at)) : null,
    }));

    const startMs = new Date(bounds.start).getTime();
    const endMs = new Date(bounds.end).getTime();

    const periodClosed = posRecords.filter(r => {
      if (r.status !== 'CLOSED' || !r.closedAt) return false;
      const ts = new Date(r.closedAt).getTime();
      return ts >= startMs && ts <= endMs;
    });

    const openPositions = posRecords.filter(r => r.status === 'OPEN');

    const { rows: marks } = await p.query(`
      SELECT DISTINCT ON (instrument) instrument, price
      FROM cap_price_marks ORDER BY instrument, marked_at DESC
    `);
    const latestMarks = new Map<string, number>();
    for (const m of marks) latestMarks.set(m.instrument, parseFloat(m.price) || 0);

    if (openPositions.length > 0 && latestMarks.size === 0) {
      warnings.push('No price marks for open position valuation');
    }

    const { rows: periodFees } = await p.query(`
      SELECT id, amount, incurred_at FROM cap_fees
      WHERE incurred_at >= $1 AND incurred_at <= $2
    `, [bounds.start, bounds.end]);

    const feeRecords: FeeRecord[] = periodFees.map(r => ({
      id: r.id,
      amount: parseFloat(r.amount) || 0,
      incurredAt: r.incurred_at?.toISOString?.() ?? String(r.incurred_at),
    }));

    const realizedPnl = computeRealizedPnl(periodClosed);
    const unrealizedPnl = computeUnrealizedPnl(openPositions, latestMarks);
    const feesTotal = computeFeesTotal(feeRecords);
    const netCapitalChange = computeNetCapitalChange(realizedPnl, unrealizedPnl, feesTotal);

    const { rows: balRows } = await p.query(`
      SELECT COALESCE(SUM(debit_amount - credit_amount), 0) as balance
      FROM cap_ledger_entries
      JOIN cap_accounts ON cap_accounts.id = cap_ledger_entries.account_id
      WHERE cap_accounts.account_type = 'ASSET' AND cap_accounts.subtype = 'CASH'
    `);
    const cashBalance = parseFloat(balRows[0]?.balance) || 750;

    const deployedCapital = computeDeployedCapital(openPositions);
    const totalCapital = cashBalance + deployedCapital;
    const returnOnCapital = computeReturnOnCapital(netCapitalChange, totalCapital);
    const returnOnDeployed = computeReturnOnDeployedCapital(netCapitalChange, deployedCapital);
    const utilization = totalCapital > 0 ? deployedCapital / totalCapital : 0;
    const efficiency = returnOnDeployed * utilization;

    return {
      period,
      periodStart: bounds.start,
      periodEnd: bounds.end,
      realizedPnl,
      unrealizedPnl,
      feesTotal,
      netCapitalChange,
      returnOnCapital,
      returnOnDeployedCapital: returnOnDeployed,
      capitalEfficiencyScore: efficiency,
      totalCapital,
      deployedCapital,
      utilization,
      closedTradeCount: periodClosed.length,
      openTradeCount: openPositions.length,
      warnings,
    };
  } finally {
    await p.end();
  }
}

export async function getDrawdownState(period: 'day' | 'week' | 'month' | 'year') {
  const p = getPool();
  try {
    const bounds = getPeriodBounds(period);

    const { rows: positions } = await p.query(`
      SELECT realized_pnl, closed_at
      FROM cap_trading_positions
      WHERE status = 'CLOSED' AND closed_at IS NOT NULL
      ORDER BY closed_at ASC
    `);

    const cashBalance = 750;
    const closedInPeriod = positions.filter(r => {
      const ts = new Date(r.closed_at).getTime();
      return ts >= new Date(bounds.start).getTime() && ts <= new Date(bounds.end).getTime();
    });

    const trades = closedInPeriod.map(r => ({
      executedAt: r.closed_at?.toISOString?.() ?? String(r.closed_at),
      pnl: parseFloat(r.realized_pnl) || 0,
    }));
    const dailyPnl = aggregateByDay(trades);

    let cumPnl = 0;
    const equityCurve = Array.from(dailyPnl.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, pnl]) => {
        cumPnl += pnl;
        return { value: cashBalance + cumPnl, at: day + 'T23:59:59.999Z' };
      });

    if (equityCurve.length === 0) {
      equityCurve.push({ value: cashBalance, at: new Date().toISOString() });
    }

    const drawdown = computeMaxDrawdown(equityCurve);
    return {
      period,
      maxDrawdown: drawdown?.depthPct ?? 0,
      peakValue: drawdown?.peakValue ?? cashBalance,
      troughValue: drawdown?.troughValue ?? cashBalance,
      status: drawdown?.status ?? 'RECOVERED',
      peakAt: drawdown?.peakAt ?? null,
      troughAt: drawdown?.troughAt ?? null,
    };
  } finally {
    await p.end();
  }
}

export async function getDriftSeries(period: 'day' | 'week' | 'month' | 'year') {
  const p = getPool();
  try {
    const bounds = getPeriodBounds(period);
    const { rows } = await p.query(`
      SELECT as_of, expected_value, actual_value, variance_pct
      FROM cap_drift_series
      WHERE as_of >= $1 AND as_of <= $2
      ORDER BY as_of ASC
    `, [bounds.start, bounds.end]);

    return {
      period,
      points: rows.map(r => ({
        asOf: r.as_of?.toISOString?.() ?? String(r.as_of),
        expectedValue: parseFloat(r.expected_value) || 0,
        actualValue: parseFloat(r.actual_value) || 0,
        variancePct: parseFloat(r.variance_pct) || 0,
      })),
    };
  } finally {
    await p.end();
  }
}

export async function getLedgerEntries(page: number = 1, pageSize: number = 50) {
  const p = getPool();
  try {
    const offset = (page - 1) * pageSize;
    const { rows: countRows } = await p.query(`SELECT count(id) as total FROM cap_ledger_entries`);
    const total = parseInt(countRows[0]?.total) || 0;

    const { rows } = await p.query(`
      SELECT le.id, le.tx_group_id, le.account_id, le.debit_amount, le.credit_amount,
             le.currency, le.description, le.external_id, le.source_type, le.created_at,
             a.name as account_name
      FROM cap_ledger_entries le
      LEFT JOIN cap_accounts a ON a.id = le.account_id
      ORDER BY le.created_at DESC
      LIMIT $1 OFFSET $2
    `, [pageSize, offset]);

    return {
      entries: rows.map(r => ({
        id: r.id,
        txGroupId: r.tx_group_id,
        accountId: r.account_id,
        accountName: r.account_name,
        debitAmount: parseFloat(r.debit_amount) || 0,
        creditAmount: parseFloat(r.credit_amount) || 0,
        currency: r.currency,
        description: r.description,
        externalId: r.external_id,
        sourceType: r.source_type,
        createdAt: r.created_at?.toISOString?.() ?? String(r.created_at),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } finally {
    await p.end();
  }
}

export async function getSnapshots(page: number = 1, pageSize: number = 20) {
  const p = getPool();
  try {
    const offset = (page - 1) * pageSize;
    const { rows: countRows } = await p.query(`SELECT count(id) as total FROM cap_snapshots`);
    const total = parseInt(countRows[0]?.total) || 0;

    const { rows } = await p.query(`
      SELECT id, as_of, checksum, sources_used, confidence, warnings, regime_band, policy_state, created_at
      FROM cap_snapshots ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [pageSize, offset]);

    return {
      snapshots: rows.map(r => ({
        id: r.id,
        asOf: r.as_of?.toISOString?.() ?? String(r.as_of),
        checksum: r.checksum,
        sourcesUsed: r.sources_used,
        confidence: r.confidence,
        warnings: r.warnings,
        regimeBand: r.regime_band,
        policyState: r.policy_state,
        createdAt: r.created_at?.toISOString?.() ?? String(r.created_at),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } finally {
    await p.end();
  }
}

export async function getSnapshotDetail(snapshotId: string) {
  const p = getPool();
  try {
    const { rows: snapRows } = await p.query(`
      SELECT id, as_of, checksum, sources_used, confidence, warnings, regime_band, policy_state, created_at
      FROM cap_snapshots WHERE id = $1
    `, [snapshotId]);

    if (snapRows.length === 0) return null;
    const snap = snapRows[0];

    const { rows: lines } = await p.query(`
      SELECT id, metric_key, metric_value, period, instrument
      FROM cap_snapshot_lines WHERE snapshot_id = $1
      ORDER BY period, metric_key
    `, [snapshotId]);

    const { rows: decisions } = await p.query(`
      SELECT id, action, rationale, metadata, created_at
      FROM cap_decision_log WHERE snapshot_id = $1
      ORDER BY created_at ASC
    `, [snapshotId]);

    const { rows: drawdowns } = await p.query(`
      SELECT id, peak_value, trough_value, depth_pct, peak_at, trough_at, recovered_at, status
      FROM cap_drawdowns WHERE snapshot_id = $1
    `, [snapshotId]);

    const { rows: drifts } = await p.query(`
      SELECT as_of, expected_value, actual_value, variance_pct
      FROM cap_drift_series WHERE snapshot_id = $1
    `, [snapshotId]);

    return {
      id: snap.id,
      asOf: snap.as_of?.toISOString?.() ?? String(snap.as_of),
      checksum: snap.checksum,
      sourcesUsed: snap.sources_used,
      confidence: snap.confidence,
      warnings: snap.warnings,
      regimeBand: snap.regime_band,
      policyState: snap.policy_state,
      createdAt: snap.created_at?.toISOString?.() ?? String(snap.created_at),
      lines: lines.map(l => ({
        id: l.id,
        metricKey: l.metric_key,
        metricValue: l.metric_value,
        period: l.period,
        instrument: l.instrument,
      })),
      decisions: decisions.map(d => ({
        id: d.id,
        action: d.action,
        rationale: d.rationale,
        metadata: d.metadata,
        createdAt: d.created_at?.toISOString?.() ?? String(d.created_at),
      })),
      drawdowns: drawdowns.map(d => ({
        id: d.id,
        peakValue: parseFloat(d.peak_value),
        troughValue: parseFloat(d.trough_value),
        depthPct: parseFloat(d.depth_pct),
        peakAt: d.peak_at?.toISOString?.() ?? String(d.peak_at),
        troughAt: d.trough_at?.toISOString?.() ?? String(d.trough_at),
        recoveredAt: d.recovered_at?.toISOString?.() ?? null,
        status: d.status,
      })),
      drifts: drifts.map(d => ({
        asOf: d.as_of?.toISOString?.() ?? String(d.as_of),
        expectedValue: parseFloat(d.expected_value),
        actualValue: parseFloat(d.actual_value),
        variancePct: parseFloat(d.variance_pct),
      })),
    };
  } finally {
    await p.end();
  }
}

export async function getStatements() {
  const p = getPool();
  try {
    const { rows: snapshots } = await p.query(`
      SELECT s.id, s.as_of, s.created_at,
             sl.metric_key, sl.metric_value, sl.period
      FROM cap_snapshots s
      JOIN cap_snapshot_lines sl ON sl.snapshot_id = s.id
      WHERE sl.period IN ('DAY', 'WEEK', 'MONTH', 'YEAR')
      ORDER BY s.created_at DESC
    `);

    const byPeriod: Record<string, Record<string, string>> = {};
    for (const row of snapshots) {
      const key = row.period + ':' + (row.as_of?.toISOString?.() ?? String(row.as_of));
      if (!byPeriod[key]) byPeriod[key] = {};
      byPeriod[key][row.metric_key] = row.metric_value;
      byPeriod[key]._period = row.period;
      byPeriod[key]._as_of = row.as_of?.toISOString?.() ?? String(row.as_of);
    }

    const statements = Object.values(byPeriod).map(m => ({
      period: m._period,
      asOf: m._as_of,
      realizedPnl: parseFloat(m.realized_pnl) || 0,
      feesTotal: parseFloat(m.fees_total) || 0,
      netCapitalChange: parseFloat(m.net_capital_change) || 0,
      closedCount: parseInt(m.closed_count) || 0,
    }));

    return statements;
  } finally {
    await p.end();
  }
}
