/**
 * /api/admin/oracle-fallbacks-alert-cleanup-csv
 *
 * Downloads `prune_alert_log_cleanup_history` rows as a CSV file for auditing
 * or compliance purposes. Optionally scoped to a date range via query params.
 *
 * Mirrors the design of /api/admin/oracle-fallbacks-prune-csv so the two
 * retention panels on the Oracle Fallback History dashboard offer the same
 * export experience.
 *
 * Auth: requires the `x-admin-key` header matching ADMIN_SOLVENCY_KEY.
 *
 * Query params (optional):
 *   from  ISO 8601 timestamp — include only rows with ran_at >= from
 *   to    ISO 8601 timestamp — include only rows with ran_at <= to
 *
 * Columns: ran_at, deleted_count, retention_days, triggered_by
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '../../../src/config/adminRoles';
import { pool } from '../../../server/db';

interface AlertCleanupHistoryRow {
  ran_at: string;
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

function parseDate(raw: string | string[] | undefined, label: string): Date | null | { error: string } {
  if (raw === undefined) return null;
  if (Array.isArray(raw)) return { error: `"${label}" must be a single value, not an array` };
  const d = new Date(raw);
  if (isNaN(d.getTime())) return { error: `"${label}" is not a valid date: ${raw}` };
  return d;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const fromResult = parseDate(req.query.from, 'from');
  const toResult = parseDate(req.query.to, 'to');

  if (fromResult && 'error' in fromResult) {
    return res.status(400).json({ success: false, error: fromResult.error });
  }
  if (toResult && 'error' in toResult) {
    return res.status(400).json({ success: false, error: toResult.error });
  }

  const fromDate = fromResult as Date | null;
  const toDate = toResult as Date | null;

  if (fromDate && toDate && fromDate > toDate) {
    return res.status(400).json({ success: false, error: '"from" must not be later than "to"' });
  }

  try {
    const conditions: string[] = [];
    const params: string[] = [];

    if (fromDate) {
      params.push(fromDate.toISOString());
      conditions.push(`ran_at >= $${params.length}::timestamptz`);
    }
    if (toDate) {
      params.push(toDate.toISOString());
      conditions.push(`ran_at <= $${params.length}::timestamptz`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query<AlertCleanupHistoryRow>(
      `SELECT ran_at, deleted_count, retention_days, triggered_by
       FROM prune_alert_log_cleanup_history
       ${where}
       ORDER BY ran_at DESC`,
      params,
    );

    const header = 'ran_at,deleted_count,retention_days,triggered_by\r\n';
    const rows = result.rows
      .map((row) =>
        [
          csvEscape(row.ran_at),
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
      'attachment; filename="prune-alert-log-cleanup-history.csv"',
    );
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Row-Count', String(result.rows.length));
    return res.status(200).send(csv);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/admin/oracle-fallbacks-alert-cleanup-csv] DB error:', err);
    return res.status(500).json({ success: false, error: message });
  }
}
