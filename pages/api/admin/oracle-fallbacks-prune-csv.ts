/**
 * /api/admin/oracle-fallbacks-prune-csv
 *
 * Streams the full `oracle_fallback_prune_history` table as a CSV file so
 * operators can download all prune runs for auditing or compliance purposes.
 *
 * Auth: requires the `x-admin-key` header matching ADMIN_SOLVENCY_KEY.
 *
 * Columns: pruned_at, deleted_count, retention_days, triggered_by
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '../../../src/config/adminRoles';
import { pool } from '../../../server/db';

interface PruneHistoryRow {
  pruned_at: string;
  deleted_count: string | number;
  retention_days: string | number;
  triggered_by: string;
}

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const result = await pool.query<PruneHistoryRow>(`
      SELECT pruned_at, deleted_count, retention_days, triggered_by
      FROM oracle_fallback_prune_history
      ORDER BY pruned_at DESC
    `);

    const header = 'pruned_at,deleted_count,retention_days,triggered_by\r\n';
    const rows = result.rows
      .map(row =>
        [
          csvEscape(row.pruned_at),
          csvEscape(row.deleted_count),
          csvEscape(row.retention_days),
          csvEscape(row.triggered_by),
        ].join(','),
      )
      .join('\r\n');

    const csv = header + rows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="oracle-fallback-prune-history.csv"',
    );
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).send(csv);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/admin/oracle-fallbacks-prune-csv] DB error:', err);
    return res.status(500).json({ success: false, error: message });
  }
}
