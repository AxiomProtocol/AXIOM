/**
 * POST /api/scheduler/prune-oracle-fallback
 *
 * Deletes axusd_oracle_fallback_events rows older than the configured
 * retention window by calling the prune_oracle_fallback_events() SQL function
 * (defined in migrations/0045_oracle_fallback_pruning.sql, updated in 0047).
 *
 * Every successful run — whether triggered here or by pg_cron — is recorded
 * in oracle_fallback_prune_history (migration 0046) by the SQL function itself.
 * The HTTP path passes triggered_by='http'; pg_cron uses the default 'pg_cron'.
 *
 * Retention window configuration (two knobs — keep them in sync):
 *  1. HTTP path  → ORACLE_FALLBACK_RETENTION_DAYS env var (default: 90 days)
 *     This endpoint reads that variable at request time.
 *  2. pg_cron path → app.oracle_fallback_retention_days Postgres GUC (default: 90)
 *     Set via: ALTER DATABASE <db> SET "app.oracle_fallback_retention_days" = '30';
 *
 * Production scheduling:
 *  If pg_cron is NOT enabled in the target database, an external scheduler
 *  (e.g. Google Cloud Scheduler) must POST to this endpoint on a regular
 *  cadence (daily recommended) with the x-scan-key header set to MIRDT_SCAN_KEY.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

const DEFAULT_RETENTION_DAYS = 90;

function isAuthorized(req: NextApiRequest): boolean {
  const scanKey = process.env.MIRDT_SCAN_KEY;
  if (!scanKey) return process.env.NODE_ENV === 'development';
  return req.headers['x-scan-key'] === scanKey;
}

function retentionDays(): number {
  const raw = process.env.ORACLE_FALLBACK_RETENTION_DAYS;
  if (!raw) return DEFAULT_RETENTION_DAYS;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const days = retentionDays();

  try {
    const result = await pool.query<{ deleted_count: string }>(
      'SELECT deleted_count FROM prune_oracle_fallback_events($1, $2)',
      [days, 'http']
    );

    const deletedCount = parseInt(result.rows[0]?.deleted_count ?? '0', 10);

    console.log(`[prune-oracle-fallback] Pruned ${deletedCount} rows older than ${days} days`);

    return res.status(200).json({
      success: true,
      deletedCount,
      retentionDays: days,
    });
  } catch (err: any) {
    console.error('[prune-oracle-fallback] Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
