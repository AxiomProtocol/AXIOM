/**
 * Capital Infrastructure — Stellar reconciliation diff engine (3B.1b).
 *
 * Replaces the Phase 3B.1a skeleton with a real diff against Horizon's
 * payments stream. The engine is strictly read-from-Horizon + write-to-
 * reconciliation-tables. It never writes to portfolio, reserve, or
 * settlement tables directly.
 *
 * Remediation (per clarification #1 and rule 7):
 *   - Calls the canonical service-layer createInstruction function, NOT
 *     an internal HTTP loop-back. The same policy gate and idempotency
 *     rules apply as for operator-created instructions.
 *   - If createInstruction is denied by policy or reserve checks, the
 *     drift row captures the failure reason in remediationFailureJson
 *     (clarification #5).
 *
 * Ambiguous match rule (clarification #6):
 *   - If a Horizon payment tx hash matches more than one local instruction
 *     (without a unique op-level discriminant), a MANUAL_INTERVENTION
 *     drift row is emitted and no remediation is attempted.
 *
 * Severity vocabulary (Phase 3 canonical ladder):
 *   INFORMATIONAL | WARNING | BLOCKING | MANUAL_INTERVENTION
 */

import { db } from '../../../server/db';
import {
  capSettlementInstructions,
  capReconciliationRuns,
} from '../../../shared/capInfraSchema';
import type { CapReconciliationRun } from '../../../shared/capInfraSchema';
import { and, eq, gte, lte, isNotNull } from 'drizzle-orm';
import { fetchHorizonPaymentsPage, type HorizonPaymentOp, type StellarNetwork } from '../adapters/stellar/sdk';
import { createInstruction } from '../settlement';
import { usdDecimalString } from '../money';
import { emitAuditEvent } from '../audit';
import { ConflictError, PolicyDeniedError } from '../errors';
import {
  createRun,
  markRunStarted,
  markRunCompleted,
  markRunFailed,
  appendDriftRow,
  type DriftRowInput,
} from './store';

const RECONCILER_ACTOR = 'stellar-recon';
const MAX_PAGES = 20; // safety: max 20 × 200 = 4 000 ops per run

export interface StellarDiffInput {
  network: StellarNetwork;
  anchorAccount: string;
  assetCode: string;
  /** If null, MISSING_LOCAL remediation is downgraded to ALERT_RAISED */
  remediationAssetId: string | null;
  remediationUserId: string | null;
  windowSince: Date;
  windowUntil: Date;
  triggeredBy: string;
  /** 3B.1b: always true; LIVE mode diff lands in 3B.2 */
  dryRun: boolean;
}

export interface StellarDiffResult {
  run: CapReconciliationRun;
  comparedCount: number;
  driftCount: number;
}

const AMOUNT_EPSILON = 0.000001;

function withinEpsilon(a: string, b: string): boolean {
  return Math.abs(parseFloat(a) - parseFloat(b)) <= AMOUNT_EPSILON;
}

type LocalInstruction = {
  id: string;
  externalRef: string | null;
  amount: string;
  status: string;
};

async function fetchLocalInstructions(since: Date, until: Date): Promise<LocalInstruction[]> {
  const rows = await db
    .select({
      id: capSettlementInstructions.id,
      externalRef: capSettlementInstructions.externalRef,
      amount: capSettlementInstructions.amount,
      status: capSettlementInstructions.status,
    })
    .from(capSettlementInstructions)
    .where(
      and(
        eq(capSettlementInstructions.settlementType, 'STELLAR'),
        gte(capSettlementInstructions.updatedAt, since),
        lte(capSettlementInstructions.updatedAt, until),
        isNotNull(capSettlementInstructions.externalRef),
      ),
    );
  return rows.map((r) => ({
    id: r.id,
    externalRef: r.externalRef,
    amount: String(r.amount),
    status: r.status,
  }));
}

async function fetchRemotePayments(
  input: StellarDiffInput,
  signal: AbortSignal,
): Promise<HorizonPaymentOp[]> {
  const all: HorizonPaymentOp[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { records, nextCursor } = await fetchHorizonPaymentsPage(
      input.network,
      input.anchorAccount,
      input.assetCode,
      cursor,
      200,
      signal,
    );
    for (const r of records) {
      const ts = new Date(r.createdAt);
      if (ts < input.windowSince) continue;
      if (ts > input.windowUntil) return all;
      all.push(r);
    }
    if (!nextCursor || records.length === 0) break;
    cursor = nextCursor;
  }
  return all;
}

/**
 * Attempt to enqueue a corrective instruction for a MISSING_LOCAL op.
 * Returns the remediation portion of a DriftRowInput.
 */
async function remediateMissingLocal(
  runId: string,
  op: HorizonPaymentOp,
  input: StellarDiffInput,
): Promise<Pick<DriftRowInput, 'remediation' | 'remediationRef' | 'remediationFailureJson'>> {
  if (!input.remediationAssetId || !input.remediationUserId) {
    return { remediation: 'ALERT_RAISED' };
  }
  // Stable idempotency key prevents duplicate enqueue on re-runs.
  const idemKey = `recon:stellar:missing-local:${runId}:${op.txHash}:${op.id}`;
  try {
    const created = await createInstruction(
      {
        userId: input.remediationUserId,
        assetId: input.remediationAssetId,
        actionType: 'TRANSFER',
        settlementType: 'STELLAR',
        // Horizon returns a USD decimal string (e.g. "12.3456"). Brand it
        // explicitly so the settlement layer accepts it. Throws on any
        // value that isn't a well-formed decimal string, which surfaces
        // upstream Horizon corruption rather than silently persisting it.
        amount: usdDecimalString(op.amount),
        idempotencyKey: idemKey,
        externalRef: op.txHash,
        payloadJson: {
          reconciliationRunId: runId,
          horizonOpId: op.id,
          horizonTxHash: op.txHash,
          source: 'stellar-recon',
        },
      },
      RECONCILER_ACTOR,
    );
    return { remediation: 'ENQUEUED_INSTRUCTION', remediationRef: created.id };
  } catch (err: unknown) {
    // Capture the failure per clarification #5.
    const reason =
      err instanceof PolicyDeniedError ? err.code
      : err instanceof ConflictError ? err.message
      : err instanceof Error ? err.message
      : String(err);
    return {
      remediation: 'ENQUEUED_INSTRUCTION',
      remediationRef: undefined,
      remediationFailureJson: { reason, idemKey },
    };
  }
}

export async function runStellarDiff(input: StellarDiffInput): Promise<StellarDiffResult> {
  const run = await createRun({
    adapterKey: 'STELLAR',
    windowSince: input.windowSince,
    windowUntil: input.windowUntil,
    triggeredBy: input.triggeredBy,
  });
  await markRunStarted(run.id);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  let comparedCount = 0;
  let driftCount = 0;

  try {
    const [remoteOps, localRows] = await Promise.all([
      fetchRemotePayments(input, controller.signal),
      fetchLocalInstructions(input.windowSince, input.windowUntil),
    ]);

    // Index local rows by externalRef for O(1) lookup.
    const localByRef = new Map<string, LocalInstruction[]>();
    for (const row of localRows) {
      if (!row.externalRef) continue;
      const list = localByRef.get(row.externalRef) ?? [];
      list.push(row);
      localByRef.set(row.externalRef, list);
    }

    // Index remote ops by txHash.
    const remoteByTx = new Map<string, HorizonPaymentOp[]>();
    for (const op of remoteOps) {
      const list = remoteByTx.get(op.txHash) ?? [];
      list.push(op);
      remoteByTx.set(op.txHash, list);
    }

    // ── Check 1: MISSING_LOCAL — remote payment has no local match ──
    for (const [txHash, ops] of remoteByTx.entries()) {
      const local = localByRef.get(txHash) ?? [];
      if (local.length > 0) continue;

      comparedCount++;
      driftCount++;
      const op = ops[0];
      const remediation = await remediateMissingLocal(run.id, op, input);
      await appendDriftRow({
        runId: run.id,
        adapterKey: 'STELLAR',
        kind: 'MISSING_LOCAL',
        severity: 'BLOCKING',
        externalRef: txHash,
        detailJson: {
          horizonOpId: op.id,
          amount: op.amount,
          assetCode: op.assetCode,
          createdAt: op.createdAt,
          from: op.from,
          to: op.to,
        },
        ...remediation,
      });
    }

    // ── Check 2: per-matched-pair checks ────────────────────────────
    for (const [txHash, ops] of remoteByTx.entries()) {
      const local = localByRef.get(txHash) ?? [];
      if (local.length === 0) continue;

      comparedCount++;

      // Ambiguous match: multiple local instructions for same tx hash,
      // no unique op-level discriminant (clarification #6).
      if (local.length > 1) {
        driftCount++;
        await appendDriftRow({
          runId: run.id,
          adapterKey: 'STELLAR',
          kind: 'AMBIGUOUS_MATCH',
          severity: 'MANUAL_INTERVENTION',
          externalRef: txHash,
          detailJson: {
            localIds: local.map((l) => l.id),
            horizonOpCount: ops.length,
          },
          remediation: 'NONE',
        });
        continue;
      }

      const localRow = local[0];
      const op = ops[0];

      if (!withinEpsilon(op.amount, localRow.amount)) {
        driftCount++;
        await appendDriftRow({
          runId: run.id,
          adapterKey: 'STELLAR',
          kind: 'AMOUNT_MISMATCH',
          severity: 'BLOCKING',
          externalRef: txHash,
          instructionId: localRow.id,
          detailJson: {
            localAmount: localRow.amount,
            observedAmount: op.amount,
            assetCode: op.assetCode,
          },
          remediation: 'NONE',
        });
      }

      if (op.assetCode !== input.assetCode) {
        driftCount++;
        await appendDriftRow({
          runId: run.id,
          adapterKey: 'STELLAR',
          kind: 'ASSET_MISMATCH',
          severity: 'BLOCKING',
          externalRef: txHash,
          instructionId: localRow.id,
          detailJson: {
            expectedAsset: input.assetCode,
            observedAsset: op.assetCode,
          },
          remediation: 'NONE',
        });
      }
    }

    // ── Check 3: MISSING_REMOTE — local SETTLED but absent on Horizon
    for (const row of localRows) {
      if (row.status !== 'SETTLED' || !row.externalRef) continue;
      if (remoteByTx.has(row.externalRef)) continue;

      comparedCount++;
      driftCount++;
      // DRY_RUN synthetic receipts (DRYRUN-...) are always INFORMATIONAL;
      // they never appear on the real Horizon.
      const isDryRunRef = row.externalRef.startsWith('DRYRUN-');
      await appendDriftRow({
        runId: run.id,
        adapterKey: 'STELLAR',
        kind: 'MISSING_REMOTE',
        severity: isDryRunRef ? 'INFORMATIONAL' : 'BLOCKING',
        externalRef: row.externalRef,
        instructionId: row.id,
        detailJson: { localStatus: row.status, isDryRunRef },
        remediation: 'NONE',
      });
    }

    await markRunCompleted(run.id, comparedCount, driftCount);
    await emitAuditEvent({
      eventType: 'reconciliation.run.completed',
      aggregateType: 'cap_reconciliation_run',
      aggregateId: run.id,
      payloadJson: { comparedCount, driftCount, adapterKey: 'STELLAR' },
    });
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : String(err);
    await markRunFailed(run.id, reason);
    await emitAuditEvent({
      eventType: 'reconciliation.run.failed',
      aggregateType: 'cap_reconciliation_run',
      aggregateId: run.id,
      payloadJson: { reason },
    });
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const [finalRun] = await db
    .select()
    .from(capReconciliationRuns)
    .where(eq(capReconciliationRuns.id, run.id))
    .limit(1);

  return { run: finalRun ?? run, comparedCount, driftCount };
}
