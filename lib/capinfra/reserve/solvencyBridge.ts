/**
 * Capital Infrastructure — Reserve-to-Solvency Snapshot Bridge (Phase 3A.2)
 *
 * Creates a canonical `solvency_snapshots` row whenever a
 * `cap_reserve_holdings_snapshot` is committed. The bridge:
 *
 *   1. Fetches the latest capinfra SPOT price for each holdings line and
 *      computes `reservesTotalUsd` (returns 0 for any asset with no price).
 *   2. Merges treasury/liability context from the most recent
 *      `solvency_snapshots` row so disclosure surfaces remain coherent.
 *   3. Writes an append-only row to `solvency_snapshots` with full
 *      operator-auditable lineage metadata in `payload_json`:
 *        - `capReserveSnapshotId` — foreign key back to the source row
 *        - `capReserveChecksum`  — SHA-256 of the canonical projection
 *        - `capReserveMode` / `capModeVersion` — reserve config at capture
 *        - `bridgeGenerator`     — version tag for forward compatibility
 *   4. Computes the solvency checksum as SHA-256 of the canonical (key-sorted)
 *      payload, truncated to 16 hex chars — matching the format used by
 *      `auto-ingest` and `ingest-snapshot`.
 *
 * Non-blocking contract: this function is always called from outside the
 * Drizzle transaction that commits the reserve snapshot. If the bridge
 * throws, the caller catches, logs, and returns `undefined` for the bridge
 * fields — reserve snapshot creation is never aborted by a bridge failure.
 */

import { createHash } from 'node:crypto';
import { pool } from '../../../server/db';
import { getLatestPrice } from '../marketData';
import { getAssetById } from '../assetRegistry';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface BridgeInput {
  /** ID of the committed `cap_reserve_holdings_snapshots` row. */
  reserveSnapshotId: string;
  /** Full SHA-256 hex checksum from the reserve snapshot projection. */
  reserveChecksum: string;
  /** Point-in-time captured for both the reserve and solvency rows. */
  asOf: Date;
  /** Reserve solvency mode at capture (OPERATIONAL / CONSERVATIVE / MANUAL_INTERVENTION). */
  mode: string;
  /** Version string from `cap_reserve_config` or "bootstrap". */
  modeVersion: string;
  /** Aggregated holdings lines — only `assetId` and `available` are used. */
  lines: Array<{
    assetId: string;
    available: string;
  }>;
}

export interface BridgeResult {
  solvencySnapshotId: string;
  solvencyChecksum: string;
  reservesTotalUsd: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Multiplier for rounding USD amounts to two decimal places. */
const CENTS_PER_DOLLAR = 100;

/** Multiplier for converting a decimal fraction to a basis-point percentage (0–100). */
const BASIS_POINTS_MULTIPLIER = 10_000;

/**
 * Maximum number of source entries carried forward from the previous
 * solvency snapshot. Capped to prevent unbounded payload growth when
 * many snapshots chain together.
 */
const MAX_HISTORICAL_SOURCES = 9;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Round a number to two decimal places (cent precision). */
function roundToCents(value: number): number {
  return Math.round(value * CENTS_PER_DOLLAR) / CENTS_PER_DOLLAR;
}

/** Stable key-sort canonicalization for deterministic JSON hashing. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = canonicalize(obj[k]);
        return acc;
      }, {});
  }
  return value;
}

/**
 * Look up the latest `solvency_snapshots` row to carry forward
 * treasury/liability context (treasuryTotalUsd, liabilitiesTotalUsd, etc.).
 * Returns an empty record when no prior snapshot exists.
 */
async function fetchExistingSolvencyPayload(): Promise<Record<string, unknown>> {
  try {
    const result = await pool.query(
      `SELECT payload_json FROM solvency_snapshots ORDER BY created_at DESC LIMIT 1`,
    );
    if (result.rows.length === 0) return {};
    const raw = result.rows[0].payload_json;
    return (typeof raw === 'string' ? JSON.parse(raw) : raw) ?? {};
  } catch {
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bridge entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Write a `solvency_snapshots` row linked to the committed reserve snapshot.
 *
 * @throws on DB write failure — callers must catch and treat as non-blocking.
 */
export async function bridgeToSolvencySnapshot(
  input: BridgeInput,
): Promise<BridgeResult> {
  // Idempotent table + index creation (mirrors the DDL in auto-ingest and
  // ingest-snapshot so the bridge works even if db-init hasn't run yet).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS solvency_snapshots (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      as_of_utc TIMESTAMP NOT NULL,
      payload_json JSONB NOT NULL,
      checksum TEXT NOT NULL,
      notes TEXT
    );
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS solvency_snap_created_idx ON solvency_snapshots(created_at);`,
  );

  // ── Step 1: carry forward treasury/liability context ─────────────────────
  const existing = await fetchExistingSolvencyPayload();

  // ── Step 2: compute per-line USD values via capinfra market prices ────────
  const lineResults = await Promise.all(
    input.lines.map(async (line) => {
      let usd = 0;
      let symbol = line.assetId;
      try {
        const [price, asset] = await Promise.all([
          getLatestPrice(line.assetId, 'SPOT'),
          getAssetById(line.assetId),
        ]);
        if (price) {
          const raw = Number(line.available) * Number(price.price);
          usd = Number.isFinite(raw) ? roundToCents(raw) : 0;
        }
        if (asset?.symbol) symbol = asset.symbol;
      } catch {
        // Non-fatal — leave usd = 0, label falls back to assetId
      }
      return { symbol, usd };
    }),
  );

  const reservesTotalUsd = roundToCents(lineResults.reduce((sum, l) => sum + l.usd, 0));

  const compositionTotal = reservesTotalUsd;
  const bridgeComposition = lineResults
    .filter((l) => l.usd > 0)
    .map((l) => ({
      label: `${l.symbol} (reserve holdings)`,
      valueUsd: l.usd,
      pct:
        compositionTotal > 0
          ? Math.round((l.usd / compositionTotal) * BASIS_POINTS_MULTIPLIER) / CENTS_PER_DOLLAR
          : 0,
    }));

  // ── Step 3: build merged payload ─────────────────────────────────────────
  const existingSources: unknown[] = Array.isArray(existing.sources)
    ? (existing.sources as unknown[])
    : [];

  const mergedPayload: Record<string, unknown> = {
    // Treasury and liability context from the latest solvency snapshot.
    // Falls back to 0 / defaults when no prior snapshot exists (bootstrap).
    treasuryTotalUsd: Number(existing.treasuryTotalUsd ?? 0),
    treasuryLiquidUsd: Number(existing.treasuryLiquidUsd ?? 0),
    liabilitiesTotalUsd: Number(existing.liabilitiesTotalUsd ?? 0),
    lossBufferUsd: Number(existing.lossBufferUsd ?? 0),
    policyMode: existing.policyMode ?? 'BOOTSTRAP',
    hardBrake: existing.hardBrake ?? 'OFF',
    gateStatus: existing.gateStatus ?? 'OPEN',

    // Live reserve data from capinfra holdings snapshot.
    reservesTotalUsd,
    composition:
      bridgeComposition.length > 0
        ? bridgeComposition
        : (existing.composition ?? []),

    // Operator-auditable lineage — links this solvency row back to the
    // exact cap_reserve_holdings_snapshots row that produced it.
    capReserveSnapshotId: input.reserveSnapshotId,
    capReserveChecksum: input.reserveChecksum,
    capReserveMode: input.mode,
    capModeVersion: input.modeVersion,
    capLineCount: input.lines.length,
    bridgeGenerator: 'reserve.solvency.bridge.v1',
    bridgeTimestamp: input.asOf.toISOString(),

    // Sources: prepend capinfra source, cap total to avoid payload bloat.
    sources: [
      {
        label: 'CapInfra Reserve Snapshot',
        detail: `ID: ${input.reserveSnapshotId}, checksum: ${input.reserveChecksum}, mode: ${input.mode}/${input.modeVersion}`,
      },
      ...existingSources.slice(0, MAX_HISTORICAL_SOURCES),
    ],
  };

  // ── Step 4: deterministic checksum ───────────────────────────────────────
  // Canonicalize (key-sort) before hashing so back-to-back snapshots over
  // identical state produce identical checksums. Truncated to 16 hex chars
  // to match the format used by auto-ingest and ingest-snapshot.
  const payloadStr = JSON.stringify(canonicalize(mergedPayload));
  const checksum = createHash('sha256').update(payloadStr).digest('hex').slice(0, 16);
  const notes = `reserve.solvency.bridge.v1 — source: ${input.reserveSnapshotId}`;

  // ── Step 5: append-only insert ───────────────────────────────────────────
  const result = await pool.query(
    `INSERT INTO solvency_snapshots (id, created_at, as_of_utc, payload_json, checksum, notes)
     VALUES (gen_random_uuid(), NOW(), $1, $2::jsonb, $3, $4)
     RETURNING id, checksum`,
    [input.asOf.toISOString(), payloadStr, checksum, notes],
  );

  const row = result.rows[0];
  return {
    solvencySnapshotId: row.id,
    solvencyChecksum: row.checksum,
    reservesTotalUsd,
  };
}
