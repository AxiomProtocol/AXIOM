/**
 * POST /api/founder/reserves/bootstrap
 *
 * Operator-facing endpoint that seeds `reserve_balance_snapshots` with
 * current live balances so sparklines render immediately after table creation.
 *
 * Body (JSON, all optional):
 *   backfillHours  number  — how many past hours to back-fill with current
 *                            balances (default 0, max 168 = 7 days). The same
 *                            balance value is written for each past hour so the
 *                            chart renders flat — better than nothing while the
 *                            real hourly cron accumulates real readings.
 *
 * Auth: x-admin-key matching ADMIN_SOLVENCY_KEY
 *
 * Idempotent: uses ON CONFLICT DO NOTHING on (symbol, snapshot_hour).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '../../../../src/config/adminRoles';
import { runReserveSnapshot } from '../../../../lib/reserves/reserveSnapshotRunner';
import { pool } from '../../../../server/db';
import type { ReservePositionsResponse } from '../reserve-positions';

function internalBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 5000}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!validateAdminKey(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const rawBackfill = Number(req.body?.backfillHours ?? 0);
  const backfillHours = Math.min(isNaN(rawBackfill) ? 0 : Math.max(0, Math.floor(rawBackfill)), 168);

  try {
    // 1. Write the current-hour snapshot via the canonical runner
    const currentResult = await runReserveSnapshot();

    // 2. Back-fill past hours if requested
    let backfillWritten: string[] = [];
    let backfillSkipped: string[] = [];
    const backfillErrors: Record<string, string> = {};

    if (backfillHours > 0) {
      const adminKey = process.env.ADMIN_SOLVENCY_KEY ?? '';
      const requestHeaders: Record<string, string> = adminKey
        ? { 'x-admin-key': adminKey }
        : { Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` };

      const url = `${internalBaseUrl()}/api/founder/reserve-positions`;
      let positions: ReservePositionsResponse | null = null;

      try {
        const r = await fetch(url, {
          headers: requestHeaders,
          signal: AbortSignal.timeout(30_000),
        });
        const j = await r.json() as ReservePositionsResponse;
        if (r.ok && j.success) positions = j;
      } catch {
        // non-fatal — skip backfill
      }

      if (positions) {
        for (let h = 1; h <= backfillHours; h++) {
          const pastHour = new Date();
          pastHour.setUTCMinutes(0, 0, 0);
          pastHour.setUTCHours(pastHour.getUTCHours() - h);

          for (const asset of positions.assets) {
            try {
              const result = await pool.query(
                `INSERT INTO reserve_balance_snapshots
                   (symbol, balance, usd_value, snapshot_hour)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (symbol, snapshot_hour) DO NOTHING`,
                [
                  asset.symbol,
                  String(asset.balance),
                  asset.usdValue != null ? String(asset.usdValue) : null,
                  pastHour,
                ],
              );
              if ((result.rowCount ?? 0) > 0) {
                if (!backfillWritten.includes(asset.symbol)) backfillWritten.push(asset.symbol);
              } else {
                if (!backfillSkipped.includes(asset.symbol)) backfillSkipped.push(asset.symbol);
              }
            } catch (err: unknown) {
              backfillErrors[asset.symbol] = err instanceof Error ? err.message : String(err);
            }
          }
        }
      }
    }

    return res.status(200).json({
      ok: true,
      current: currentResult,
      backfill: backfillHours > 0
        ? { hours: backfillHours, written: backfillWritten, skipped: backfillSkipped, errors: backfillErrors }
        : null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[reserves/bootstrap]', msg);
    return res.status(500).json({ ok: false, error: msg });
  }
}
