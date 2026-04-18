/**
 * /api/oracle/axusd-parity-fallback-metrics  (Task #100, updated Task #105)
 *
 * Surfaces the AXUSD oracle parity-fallback metrics in two forms:
 *
 *  1. `memorySnapshot` — the in-process counter maintained by
 *     `recordAxusdParityFallback`. Fast, but resets on server restart.
 *
 *  2. `windowedCounts` — durable counts derived from the
 *     `axusd_oracle_fallback_events` Postgres table, broken down by
 *     1h / 24h / 7d time windows. These survive restarts and deploys.
 *
 * If the database is unavailable the endpoint still returns 200 with the
 * in-memory snapshot and a `dbError` field explaining the failure.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAxusdParityFallbackMetrics } from '../../../server/services/oracle/axusdParityFallbackAlert';
import { pool } from '../../../server/db';

interface WindowedCounts {
  last1h: number;
  last24h: number;
  last7d: number;
}

async function queryWindowedCounts(): Promise<WindowedCounts> {
  const result = await pool.query<{ time_bucket: string; count: string }>(`
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
  `);

  const counts: WindowedCounts = { last1h: 0, last24h: 0, last7d: 0 };
  for (const row of result.rows) {
    const n = parseInt(row.count, 10);
    if (row.time_bucket === '1h') counts.last1h += n;
    if (row.time_bucket === '24h') counts.last24h += n;
    if (row.time_bucket === '7d') counts.last7d += n;
  }
  // The CASE buckets are mutually exclusive per row; roll up to cumulative windows.
  counts.last24h += counts.last1h;
  counts.last7d += counts.last24h;
  return counts;
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const memorySnapshot = getAxusdParityFallbackMetrics();

  let windowedCounts: WindowedCounts | null = null;
  let dbError: string | null = null;

  try {
    windowedCounts = await queryWindowedCounts();
  } catch (err: unknown) {
    dbError = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[axusd-parity-fallback-metrics] DB query failed:', err);
  }

  return res.status(200).json({
    success: true,
    // Backward-compatible alias: external tooling built against the Task #100
    // shape may still read `metrics`. Use `memorySnapshot` in new consumers.
    metrics: memorySnapshot,
    memorySnapshot,
    windowedCounts,
    ...(dbError ? { dbError } : {}),
    note:
      'memorySnapshot is the in-process counter (resets on restart). ' +
      'windowedCounts are durable DB-backed counts for the last 1h / 24h / 7d. ' +
      'The `metrics` field is a backward-compatible alias for memorySnapshot.',
  });
}
