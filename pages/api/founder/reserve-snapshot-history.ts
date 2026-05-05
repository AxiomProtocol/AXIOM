/**
 * GET /api/founder/reserve-snapshot-history
 *
 * Returns the last N days of hourly balance snapshots per asset so the
 * Reserves tab can render 7-day sparklines.
 *
 * Query params:
 *   days  (default 7, max 30)
 *
 * Response:
 *   {
 *     success: true,
 *     generatedAt: string,       // ISO-8601
 *     days: number,
 *     history: {
 *       [symbol: string]: Array<{
 *         t: string,             // ISO-8601 snapshot_hour
 *         balance: number,
 *         usdValue: number | null
 *       }>
 *     }
 *   }
 *
 * Auth: x-admin-key matching ADMIN_SOLVENCY_KEY (same gate as reserve-positions)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '../../../src/config/adminRoles';
import { pool } from '../../../server/db';

interface SnapshotRow {
  symbol: string;
  snapshot_hour: Date;
  balance: string;
  usd_value: string | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const adminKey = (req.headers['x-admin-key'] as string) ?? '';
  if (!validateAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const rawDays = parseInt(String(req.query.days ?? '7'), 10);
  const days = Math.min(Math.max(isNaN(rawDays) ? 7 : rawDays, 1), 30);

  try {
    const { rows } = await pool.query<SnapshotRow>(
      `SELECT symbol, snapshot_hour, balance, usd_value
       FROM reserve_balance_snapshots
       WHERE snapshot_hour >= now() - ($1 || ' days')::interval
       ORDER BY symbol, snapshot_hour ASC`,
      [days],
    );

    const history: Record<string, Array<{ t: string; balance: number; usdValue: number | null }>> = {};

    for (const row of rows) {
      if (!history[row.symbol]) history[row.symbol] = [];
      history[row.symbol].push({
        t: new Date(row.snapshot_hour).toISOString(),
        balance: parseFloat(row.balance),
        usdValue: row.usd_value != null ? parseFloat(row.usd_value) : null,
      });
    }

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      days,
      history,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[reserve-snapshot-history] DB error:', message);
    return res.status(500).json({ success: false, error: message });
  }
}
