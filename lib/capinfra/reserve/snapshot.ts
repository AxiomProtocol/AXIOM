/**
 * Capital Infrastructure — Phase 3A.2 reserve holdings snapshot.
 *
 * Deterministic snapshot of the per-asset, per-attestation aggregated
 * holdings inventory at the moment of capture. Per §7.F, lines are
 * ordered by `(asset_id, attestation_ref NULLS FIRST, line_index)`
 * and the canonical JSON projection (with explicit `lineIndex`) is
 * sha256-hashed to form the snapshot checksum. Back-to-back snapshots
 * over identical ledger state produce identical checksums.
 */

import { createHash } from 'node:crypto';
import { db } from '../../../server/db';
import {
  capReserveHoldings,
  capReserveHoldingsSnapshots,
  capReserveHoldingsSnapshotLines,
  type CapReserveHoldingsSnapshot,
} from '../../../shared/capInfraSchema';
import { sql, eq, asc } from 'drizzle-orm';
import { generateId } from '../ids';
import { emitAuditEventStrict } from '../audit';
import { getActiveSolvencyMode } from './solvencyMode';
import { NotFoundError } from '../errors';
import { bridgeToSolvencySnapshot, type BridgeResult } from './solvencyBridge';

interface AggregatedLine {
  assetId: string;
  attestationRef: string | null;
  gross: string;
  debited: string;
  available: string;
}

/**
 * Aggregate holdings into (assetId, attestationRef) buckets.
 * SQL handles the SUM, deterministic ordering is applied here so
 * the projection matches the snapshot lines exactly.
 */
async function aggregateLedger(): Promise<AggregatedLine[]> {
  const rows = await db
    .select({
      assetId: capReserveHoldings.assetId,
      attestationRef: capReserveHoldings.attestationRef,
      gross: sql<string>`COALESCE(SUM(CASE WHEN ${capReserveHoldings.direction} = 'CREDIT' THEN ${capReserveHoldings.amount} ELSE 0 END), 0)::text`,
      debited: sql<string>`COALESCE(SUM(CASE WHEN ${capReserveHoldings.direction} = 'DEBIT' THEN ${capReserveHoldings.amount} ELSE 0 END), 0)::text`,
    })
    .from(capReserveHoldings)
    .groupBy(capReserveHoldings.assetId, capReserveHoldings.attestationRef);

  // Deterministic order: assetId ASC, then attestationRef NULLS FIRST.
  const sorted = [...rows].sort((a, b) => {
    if (a.assetId !== b.assetId) return a.assetId < b.assetId ? -1 : 1;
    const aNull = a.attestationRef === null || a.attestationRef === undefined;
    const bNull = b.attestationRef === null || b.attestationRef === undefined;
    if (aNull && bNull) return 0;
    if (aNull) return -1;
    if (bNull) return 1;
    return (a.attestationRef as string) < (b.attestationRef as string) ? -1 : 1;
  });

  return sorted.map((r) => {
    const available = (Number(r.gross) - Number(r.debited)).toString();
    return {
      assetId: r.assetId,
      attestationRef: r.attestationRef ?? null,
      gross: r.gross,
      debited: r.debited,
      available,
    };
  });
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
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

export interface ProjectedSnapshot {
  mode: string;
  modeVersion: string;
  lineCount: number;
  lines: Array<{
    lineIndex: number;
    assetId: string;
    attestationRef: string | null;
    gross: string;
    debited: string;
    available: string;
  }>;
}

export async function projectSnapshot(): Promise<{
  projection: ProjectedSnapshot;
  checksum: string;
  mode: string;
  modeVersion: string;
}> {
  const lines = await aggregateLedger();
  const mode = await getActiveSolvencyMode();
  const projection: ProjectedSnapshot = {
    mode: mode.mode,
    modeVersion: mode.version,
    lineCount: lines.length,
    lines: lines.map((l, i) => ({ lineIndex: i, ...l })),
  };
  const canonical = JSON.stringify(canonicalize(projection));
  const checksum = createHash('sha256').update(canonical).digest('hex');
  return { projection, checksum, mode: mode.mode, modeVersion: mode.version };
}

export async function createSnapshot(actor: string): Promise<{
  snapshot: CapReserveHoldingsSnapshot;
  checksum: string;
  lineCount: number;
  solvencySnapshotId?: string;
  solvencyChecksum?: string;
  reservesTotalUsd?: number;
}> {
  const { projection, checksum, mode, modeVersion } = await projectSnapshot();
  const id = generateId('rhs');
  const asOf = new Date();
  const result = await db.transaction(async (tx) => {
    await tx.insert(capReserveHoldingsSnapshots).values({
      id,
      asOf,
      mode,
      checksum,
      lineCount: projection.lineCount,
      sourcesJson: { modeVersion, generator: 'reserve.snapshot.v1' },
      createdBy: actor,
    });
    if (projection.lines.length > 0) {
      await tx.insert(capReserveHoldingsSnapshotLines).values(
        projection.lines.map((l) => ({
          id: generateId('rhsl'),
          snapshotId: id,
          assetId: l.assetId,
          attestationRef: l.attestationRef,
          lineIndex: l.lineIndex,
          gross: l.gross,
          encumbered: '0',
          available: l.available,
        })),
      );
    }
    await emitAuditEventStrict(
      {
        eventType: 'reserve.snapshot.created',
        aggregateType: 'cap_reserve_holdings_snapshot',
        aggregateId: id,
        actor,
        payloadJson: {
          checksum,
          lineCount: projection.lineCount,
          mode,
          modeVersion,
        },
      },
      tx,
    );
    const [snap] = await tx
      .select()
      .from(capReserveHoldingsSnapshots)
      .where(eq(capReserveHoldingsSnapshots.id, id));
    return snap;
  });

  // ── Solvency Snapshot Bridge ───────────────────────────────────────────────
  // After the reserve snapshot is committed, create the corresponding canonical
  // solvency_snapshots row so disclosure surfaces reflect live reserve state.
  // Non-blocking: bridge failure is caught and logged; reserve snapshot
  // creation is never aborted by a bridge write error.
  let bridgeResult: BridgeResult | undefined;
  try {
    bridgeResult = await bridgeToSolvencySnapshot({
      reserveSnapshotId: id,
      reserveChecksum: checksum,
      asOf,
      mode,
      modeVersion,
      lines: projection.lines.map((l) => ({
        assetId: l.assetId,
        available: l.available,
      })),
    });
  } catch (err) {
    console.error(
      '[reserve.snapshot] solvency bridge failed (non-blocking):',
      err instanceof Error ? err.message : String(err),
    );
  }

  return {
    snapshot: result,
    checksum,
    lineCount: projection.lineCount,
    solvencySnapshotId: bridgeResult?.solvencySnapshotId,
    solvencyChecksum: bridgeResult?.solvencyChecksum,
    reservesTotalUsd: bridgeResult?.reservesTotalUsd,
  };
}

export async function getSnapshot(id: string) {
  const [snap] = await db
    .select()
    .from(capReserveHoldingsSnapshots)
    .where(eq(capReserveHoldingsSnapshots.id, id))
    .limit(1);
  if (!snap) throw new NotFoundError(`reserve snapshot not found: ${id}`);
  const lines = await db
    .select()
    .from(capReserveHoldingsSnapshotLines)
    .where(eq(capReserveHoldingsSnapshotLines.snapshotId, id))
    .orderBy(asc(capReserveHoldingsSnapshotLines.lineIndex));
  return { snapshot: snap, lines };
}
