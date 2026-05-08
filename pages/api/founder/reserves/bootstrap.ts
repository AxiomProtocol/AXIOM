/**
 * POST /api/founder/reserves/bootstrap
 *
 * Calls fetchReservePositions() directly (no HTTP self-call) then writes:
 *   1. A snapshot for the current clock-hour
 *   2. Identical rows for N past hours (backfill, default 48, max 168)
 *
 * Auth: x-admin-key matching ADMIN_SOLVENCY_KEY
 * Idempotent: ON CONFLICT DO NOTHING on (symbol, snapshot_hour)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '../../../../src/config/adminRoles';
import { pool } from '../../../../server/db';
import { fetchReservePositions, ReserveAssetPosition } from '../../../../lib/reserves/fetchReservePositions';

function currentHour(): Date {
  const d = new Date();
  d.setUTCMinutes(0, 0, 0);
  return d;
}

async function writeSnapshot(
  assets: ReserveAssetPosition[],
  hour: Date,
): Promise<{ written: string[]; skipped: string[] }> {
  const written: string[] = [];
  const skipped: string[] = [];
  for (const asset of assets) {
    const result = await pool.query(
      `INSERT INTO reserve_balance_snapshots (symbol, balance, usd_value, snapshot_hour)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (symbol, snapshot_hour) DO NOTHING`,
      [
        asset.symbol,
        String(asset.balance),
        asset.usdValue != null ? String(asset.usdValue) : null,
        hour,
      ],
    );
    if ((result.rowCount ?? 0) > 0) written.push(asset.symbol);
    else skipped.push(asset.symbol);
  }
  return { written, skipped };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!validateAdminKey(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const rawBackfill = Number(req.body?.backfillHours ?? 48);
  const backfillHours = Math.min(isNaN(rawBackfill) ? 48 : Math.max(0, Math.floor(rawBackfill)), 168);

  try {
    const positions = await fetchReservePositions();
    const assets = positions.assets;
    const now = currentHour();

    const currentResult = await writeSnapshot(assets, now);

    const backfillWritten = new Set<string>();
    const backfillSkipped = new Set<string>();

    for (let h = 1; h <= backfillHours; h++) {
      const pastHour = new Date(now);
      pastHour.setUTCHours(pastHour.getUTCHours() - h);
      const { written, skipped } = await writeSnapshot(assets, pastHour);
      written.forEach(s => backfillWritten.add(s));
      skipped.forEach(s => backfillSkipped.add(s));
    }

    return res.status(200).json({
      ok: true,
      current: {
        snapshotHour: now.toISOString(),
        written: currentResult.written,
        skipped: currentResult.skipped,
      },
      backfill: {
        hours: backfillHours,
        written: [...backfillWritten],
        skipped: [...backfillSkipped],
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[reserves/bootstrap]', msg);
    return res.status(500).json({ ok: false, error: msg });
  }
}
