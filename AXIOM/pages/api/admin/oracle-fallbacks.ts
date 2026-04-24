/**
 * /api/admin/oracle-fallbacks
 *
 * Returns time-windowed fallback counts, a paginated list of recent
 * oracle fallback events from `axusd_oracle_fallback_events`, the
 * most-recent entry from `oracle_fallback_prune_history` (`lastPrune`),
 * and the last 30 prune runs (`pruneHistory`) so the dashboard can show
 * a full history and spot missed or failed runs.
 *
 * Auth: requires the `x-admin-key` header matching ADMIN_SOLVENCY_KEY.
 *
 * Query params:
 *   limit  — max rows to return (default 50, max 200)
 *   offset — pagination offset (default 0)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '../../../src/config/adminRoles';
import { pool } from '../../../server/db';

interface FallbackEvent {
  id: number;
  occurred_at: string;
  caller: string;
  loan_id: string | null;
  principal_usd: string | null;
  reason: string | null;
}

interface WindowedCounts {
  last1h: number;
  last24h: number;
  last7d: number;
}

interface CallerCount {
  caller: string;
  count: number;
}

interface LastPrune {
  pruned_at: string;
  deleted_count: number;
  retention_days: number;
  triggered_by: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));
  const offset = Math.max(0, parseInt(String(req.query.offset ?? '0'), 10) || 0);

  try {
    const [windowResult, eventsResult, callerResult, totalResult, pruneHistoryResult] = await Promise.all([
      pool.query<{ time_bucket: string; count: string }>(`
        SELECT
          CASE
            WHEN occurred_at >= NOW() - INTERVAL '1 hour'   THEN '1h'
            WHEN occurred_at >= NOW() - INTERVAL '24 hours' THEN '24h'
            ELSE '7d'
          END AS time_bucket,
          COUNT(*) AS count
        FROM axusd_oracle_fallback_events
        WHERE occurred_at >= NOW() - INTERVAL '7 days'
        GROUP BY time_bucket
      `),
      pool.query<FallbackEvent>(`
        SELECT id, occurred_at, caller, loan_id, principal_usd, reason
        FROM axusd_oracle_fallback_events
        ORDER BY occurred_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query<CallerCount>(`
        SELECT caller, COUNT(*) AS count
        FROM axusd_oracle_fallback_events
        WHERE occurred_at >= NOW() - INTERVAL '7 days'
        GROUP BY caller
        ORDER BY count DESC
        LIMIT 20
      `),
      pool.query<{ total: string }>(`SELECT COUNT(*) AS total FROM axusd_oracle_fallback_events`),
      pool.query<LastPrune>(`
        SELECT pruned_at, deleted_count, retention_days, triggered_by
        FROM oracle_fallback_prune_history
        ORDER BY pruned_at DESC
        LIMIT 30
      `),
    ]);

    const windowedCounts: WindowedCounts = { last1h: 0, last24h: 0, last7d: 0 };
    for (const row of windowResult.rows) {
      const n = parseInt(row.count, 10);
      if (row.time_bucket === '1h') windowedCounts.last1h += n;
      if (row.time_bucket === '24h') windowedCounts.last24h += n;
      if (row.time_bucket === '7d') windowedCounts.last7d += n;
    }
    windowedCounts.last24h += windowedCounts.last1h;
    windowedCounts.last7d += windowedCounts.last24h;

    const pruneHistory: LastPrune[] = pruneHistoryResult.rows.map(row => ({
      pruned_at: row.pruned_at,
      deleted_count: Number(row.deleted_count),
      retention_days: row.retention_days,
      triggered_by: row.triggered_by,
    }));

    const lastPrune: LastPrune | null = pruneHistory[0] ?? null;

    return res.status(200).json({
      success: true,
      windowedCounts,
      topCallers: callerResult.rows.map(r => ({ caller: r.caller, count: parseInt(String(r.count), 10) })),
      events: eventsResult.rows,
      pagination: {
        total: parseInt(totalResult.rows[0]?.total ?? '0', 10),
        limit,
        offset,
      },
      lastPrune,
      pruneHistory,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/admin/oracle-fallbacks] DB error:', err);
    return res.status(500).json({ success: false, error: message });
  }
}
