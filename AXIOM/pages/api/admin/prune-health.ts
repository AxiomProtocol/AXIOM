/**
 * /api/admin/prune-health
 *
 * Lightweight health-check endpoint that reports whether the oracle-fallback
 * pruning job has run within the expected window. Designed for polling by
 * external uptime monitors (e.g. Better Uptime, Cronitor, PagerDuty).
 *
 * Auth: requires the `x-admin-key` header matching ADMIN_SOLVENCY_KEY.
 *
 * Response shape (healthy / stale):
 *   200 { ok: true,  status: "ok",       last_pruned_at, hours_since_prune, threshold_hours }
 *   200 { ok: false, status: "stale"|"never_run", last_pruned_at|null, hours_since_prune|null, threshold_hours }
 *
 * Healthy and stale responses both use HTTP 200 so monitors can parse the JSON
 * body rather than relying on status codes — set your monitor to alert on
 * `ok: false`. Auth failures (401), wrong method (405), and DB errors (500)
 * return non-200 status with { success: false, error: "..." }.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '../../../src/config/adminRoles';
import { pool } from '../../../server/db';
import { PRUNE_STALE_HOURS } from '../../../lib/admin/config';

interface PruneHealthResponse {
  ok: boolean;
  status: 'ok' | 'stale' | 'never_run';
  last_pruned_at: string | null;
  hours_since_prune: number | null;
  threshold_hours: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PruneHealthResponse | { success: false; error: string }>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const result = await pool.query<{ pruned_at: string }>(
      `SELECT pruned_at FROM oracle_fallback_prune_history ORDER BY pruned_at DESC LIMIT 1`,
    );

    const lastRow = result.rows[0] ?? null;

    if (!lastRow) {
      return res.status(200).json({
        ok: false,
        status: 'never_run',
        last_pruned_at: null,
        hours_since_prune: null,
        threshold_hours: PRUNE_STALE_HOURS,
      });
    }

    const hoursSince =
      (Date.now() - new Date(lastRow.pruned_at).getTime()) / (1000 * 60 * 60);
    const isStale = hoursSince >= PRUNE_STALE_HOURS;

    return res.status(200).json({
      ok: !isStale,
      status: isStale ? 'stale' : 'ok',
      last_pruned_at: lastRow.pruned_at,
      hours_since_prune: Math.round(hoursSince * 10) / 10,
      threshold_hours: PRUNE_STALE_HOURS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/admin/prune-health] DB error:', err);
    return res.status(500).json({ success: false, error: message });
  }
}
