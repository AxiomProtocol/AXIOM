/**
 * lib/reserves/reserveSnapshotRunner.ts
 *
 * Hourly reserve-balance snapshot writer.
 *
 * Calls the canonical /api/founder/reserve-positions handler (via internal
 * HTTP) so snapshot values are *identical* to what the Reserves tab shows —
 * ETH, PAXG, AXAU, AXM, USDC, AXUSD balances and USD values all come from
 * the same computation with the same address set and price sources.
 *
 * The INSERT uses ON CONFLICT DO NOTHING against the (symbol, snapshot_hour)
 * unique index, so running more than once inside the same clock-hour is safe.
 *
 * All DB access goes through `pool` from server/db.ts (inherits Neon SSL
 * config and the no-op proxy when DATABASE_URL is absent).
 */

import { pool as sharedPool } from '../../server/db';
import type { ReservePositionsResponse } from '../../pages/api/founder/reserve-positions';

// ── App-URL resolution ──────────────────────────────────────────────────────

function internalBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Fallback for local dev / Replit dev server
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

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
  const adminKey = process.env.ADMIN_SOLVENCY_KEY ?? '';
  if (!adminKey) {
    throw new Error('ADMIN_SOLVENCY_KEY is not set — cannot call reserve-positions API');
  }

  const snapshotHour = currentSnapshotHour();
  const written: string[] = [];
  const skipped: string[] = [];
  const errors: Record<string, string> = {};

  // ── Fetch live positions from the canonical handler ───────────────────────
  const url = `${internalBaseUrl()}/api/founder/reserve-positions`;
  let positions: ReservePositionsResponse;

  try {
    const res = await fetch(url, {
      headers: { 'x-admin-key': adminKey },
      signal: AbortSignal.timeout(55_000),
    });
    const json = await res.json() as ReservePositionsResponse;
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? `HTTP ${res.status}`);
    }
    positions = json;
  } catch (err: unknown) {
    throw new Error(
      `Failed to fetch reserve positions: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // ── Write one row per asset — ON CONFLICT (symbol, snapshot_hour) DO NOTHING
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
      if ((result.rowCount ?? 0) > 0) {
        written.push(asset.symbol);
      } else {
        skipped.push(asset.symbol);
      }
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
