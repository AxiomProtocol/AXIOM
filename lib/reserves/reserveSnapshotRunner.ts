/**
 * lib/reserves/reserveSnapshotRunner.ts
 *
 * Hourly reserve-balance snapshot writer.
 *
 * Calls fetchReservePositions() directly — no internal HTTP self-call —
 * so it works in any environment (Replit, Vercel, CI) without needing
 * the dev server to be reachable via a public URL.
 */

import { pool as sharedPool } from '../../server/db';
import { fetchReservePositions } from './fetchReservePositions';

// ── Snapshot hour helper ────────────────────────────────────────────────────

function currentSnapshotHour(): Date {
  const d = new Date();
  d.setUTCMinutes(0, 0, 0);
  return d;
}

// ── Main runner ─────────────────────────────────────────────────────────────

export interface SnapshotRunResult {
  snapshotHour: string;
  written: string[];
  skipped: string[];
  errors: Record<string, string>;
}

export async function runReserveSnapshot(): Promise<SnapshotRunResult> {
  const positions = await fetchReservePositions();

  const snapshotHour = currentSnapshotHour();
  const written: string[] = [];
  const skipped: string[] = [];
  const errors: Record<string, string> = {};

  for (const asset of positions.assets) {
    try {
      const result = await sharedPool.query(
        `INSERT INTO reserve_balance_snapshots
           (symbol, balance, usd_value, snapshot_hour)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (symbol, snapshot_hour) DO NOTHING`,
        [
          asset.symbol,
          String(asset.balance),
          asset.usdValue != null ? String(asset.usdValue) : null,
          snapshotHour,
        ],
      );
      if ((result.rowCount ?? 0) > 0) written.push(asset.symbol);
      else skipped.push(asset.symbol);
    } catch (err: unknown) {
      errors[asset.symbol] = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    snapshotHour: snapshotHour.toISOString(),
    written,
    skipped,
    errors,
  };
}
