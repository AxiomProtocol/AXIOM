/**
 * Capital Infrastructure — Increase (ACH) reconciliation diff engine (3B.3).
 *
 * Real diff against the Increase transactions API. Mirrors stellarDiff.ts
 * in structure and all hard contracts:
 *
 *   - No portfolio, reserve, or settlement table writes.
 *   - Remediation calls canonical createInstruction (not HTTP loopback).
 *   - Remediation failure → remediationFailureJson (never re-thrown).
 *   - Ambiguous match (>1 instruction per externalRef) → MANUAL_INTERVENTION.
 *   - DRYRUN-ACH-* externalRefs → INFORMATIONAL (expected in DRY_RUN).
 *   - PENDING-APPROVAL-* externalRefs → INFORMATIONAL (MANUAL_APPROVAL mode:
 *     no Increase transfer submitted yet; these are local holding refs).
 *   - SUBMITTED instructions ARE included in local lookup (they have a real
 *     Increase transfer id as externalRef and must be compared for drift).
 *   - MANUAL_APPROVAL mode: skip remote Increase fetch entirely (no transfers
 *     were submitted to Increase while in MANUAL_APPROVAL mode).
 *
 * Amount comparison uses deterministic integer arithmetic via
 * decimalStringToCents (no floating-point).
 */

import { db } from '../../../server/db';
import { capSettlementInstructions } from '../../../shared/capInfraSchema';
import { and, eq, gte, isNotNull, lte } from 'drizzle-orm';
import {
  fetchIncreaseTransactionsPage,
  decimalStringToCents,
  type IncreaseTransaction,
  type IncreaseEnvironment,
} from '../adapters/ach/sdk';
import { createInstruction, externallySettleInstruction } from '../settlement';
import { ConflictError, PolicyDeniedError } from '../errors';
import {
  createRun,
  markRunStarted,
  markRunCompleted,
  markRunFailed,
  appendDriftRow,
} from './store';
import type { CapReconciliationRun } from '../../../shared/capInfraSchema';

const RECONCILER_ACTOR = 'ach-recon';
const MAX_PAGES = 20;

// Local-lookup inclusion: AUTHORIZED/EXECUTING/SETTLED + SUBMITTED.
// PENDING_OPERATOR_APPROVAL uses PENDING-APPROVAL-* refs which have no
// counterpart in Increase and are classified as INFORMATIONAL.
// PENDING/FAILED/CANCELLED have null externalRef and are excluded by isNotNull.
const RECON_LOCAL_STATUSES = ['AUTHORIZED', 'EXECUTING', 'SETTLED', 'SUBMITTED'] as const;

export interface IncreaseDiffInput {
  environment: IncreaseEnvironment;
  accountId: string;
  windowSince: Date;
  windowUntil: Date;
  triggeredBy: string;
  remediationAssetId: string | null;
  remediationUserId: string | null;
  dryRun: boolean;
  /**
   * Adapter mode affects reconciliation behavior:
   *   DRY_RUN       — skip remote Increase API fetch entirely (DRYRUN-* refs have no counterpart)
   *   MANUAL_APPROVAL — skip remote fetch (no transfers submitted to Increase in this mode)
   *   LIVE_CANARY / LIVE — full remote fetch + diff
   */
  adapterMode?: string;
}

export interface IncreaseDiffResult {
  run: CapReconciliationRun;
  comparedCount: number;
  driftCount: number;
}

/**
 * Derive the canonical externalRef from an Increase transaction.
 * Returns null when the route type is not yet mapped.
 */
function deriveExternalRef(tx: IncreaseTransaction): string | null {
  const src = tx.source;
  if (!src) return null;
  if (tx.route_type === 'ach' && src.ach_transfer_id) return src.ach_transfer_id;
  if (tx.route_type === 'wire' && src.wire_transfer_id) return src.wire_transfer_id;
  return null;
}

/**
 * Local-holding refs that should never be compared against Increase:
 *   DRYRUN-ACH-*      : synthetic DRY_RUN refs (no Increase account/API call)
 *   PENDING-APPROVAL-* : MANUAL_APPROVAL mode holding refs (no Increase call yet)
 */
function isLocalHoldingRef(ref: string): boolean {
  return ref.startsWith('DRYRUN-ACH-') || ref.startsWith('PENDING-APPROVAL-');
}

export async function runIncreaseDiff(input: IncreaseDiffInput): Promise<IncreaseDiffResult> {
  const run = await createRun({
    adapterKey: 'ACH',
    windowSince: input.windowSince,
    windowUntil: input.windowUntil,
    triggeredBy: input.triggeredBy,
  });

  // DRY_RUN and MANUAL_APPROVAL: skip remote Increase API fetch entirely.
  //   DRY_RUN         — DRYRUN-ACH-* refs never appear in Increase.
  //   MANUAL_APPROVAL — no transfers have been submitted to Increase.
  if (input.adapterMode === 'DRY_RUN' || input.adapterMode === 'MANUAL_APPROVAL') {
    const note = input.adapterMode === 'MANUAL_APPROVAL'
      ? 'MANUAL_APPROVAL_SKIP: no transfers submitted to Increase in MANUAL_APPROVAL mode'
      : 'DRY_RUN_SKIP: remote Increase API fetch omitted in DRY_RUN mode';
    await markRunStarted(run.id);
    await markRunCompleted(run.id, 0, 0, note);
    return { run: { ...run, status: 'COMPLETED', comparedCount: 0, driftCount: 0 }, comparedCount: 0, driftCount: 0 };
  }

  await markRunStarted(run.id);

  try {
    const result = await _runDiff(run, input);
    await markRunCompleted(run.id, result.comparedCount, result.driftCount);
    return { run, ...result };
  } catch (err: unknown) {
    await markRunFailed(run.id, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

async function _runDiff(
  run: CapReconciliationRun,
  input: IncreaseDiffInput,
): Promise<{ comparedCount: number; driftCount: number }> {
  // ── Step 1: Page all Increase transactions in the window ──────────
  const remoteByRef = new Map<string, IncreaseTransaction>();
  let cursor: string | null = null;
  let pages = 0;

  while (pages < MAX_PAGES) {
    const page = await fetchIncreaseTransactionsPage({
      environment: input.environment,
      accountId: input.accountId,
      since: input.windowSince,
      until: input.windowUntil,
      cursor,
      limit: 100,
    });

    for (const tx of page.data) {
      const ref = deriveExternalRef(tx);
      if (ref) remoteByRef.set(ref, tx);
    }

    if (!page.nextCursor) break;
    cursor = page.nextCursor;
    pages++;
  }

  // ── Step 2: Fetch local ACH instructions with real externalRefs ───
  // SUBMITTED instructions ARE included — they have real Increase transfer IDs.
  // PENDING_OPERATOR_APPROVAL instructions have PENDING-APPROVAL-* refs which
  // isNotNull will still match, but we'll classify them as INFORMATIONAL below.
  const localRows = await db
    .select()
    .from(capSettlementInstructions)
    .where(
      and(
        eq(capSettlementInstructions.settlementType, 'ACH'),
        isNotNull(capSettlementInstructions.externalRef),
        gte(capSettlementInstructions.createdAt, input.windowSince),
        lte(capSettlementInstructions.createdAt, input.windowUntil),
      ),
    );

  // ── Step 3: Build local lookup by externalRef ─────────────────────
  const localByRef = new Map<string, typeof localRows>();
  for (const row of localRows) {
    if (!row.externalRef) continue;
    const existing = localByRef.get(row.externalRef) ?? [];
    existing.push(row);
    localByRef.set(row.externalRef, existing);
  }

  const seenLocalRefs = new Set<string>();
  let comparedCount = 0;
  let driftCount = 0;

  // ── Step 4: Match remote transactions to local instructions ───────
  for (const [ref, tx] of remoteByRef.entries()) {
    const localMatches = localByRef.get(ref) ?? [];
    seenLocalRefs.add(ref);
    comparedCount++;

    if (localMatches.length > 1) {
      await appendDriftRow({
        runId: run.id,
        adapterKey: 'ACH',
        kind: 'AMBIGUOUS_MATCH',
        severity: 'MANUAL_INTERVENTION',
        externalRef: ref,
        detailJson: {
          increaseTransactionId: tx.id,
          matchCount: localMatches.length,
          localIds: localMatches.map((r) => r.id),
        },
        remediation: 'NONE',
      });
      driftCount++;
      continue;
    }

    if (localMatches.length === 0) {
      const amountStr = String(Math.abs(tx.amount));
      let remediationRef: string | undefined;
      let remediationFailureJson: Record<string, unknown> | undefined;

      if (input.remediationAssetId && input.remediationUserId) {
        const idemKey = `recon:ach:missing-local:${run.id}:${tx.id}`;
        try {
          const created = await createInstruction(
            {
              userId: input.remediationUserId,
              assetId: input.remediationAssetId,
              actionType: tx.amount > 0 ? 'REDEEM' : 'TRANSFER',
              settlementType: 'ACH',
              amount: amountStr,
              externalRef: ref,
              idempotencyKey: idemKey,
              payloadJson: {
                source: 'ach_recon_remediation',
                increaseTransactionId: tx.id,
                direction: tx.amount > 0 ? 'CREDIT' : 'DEBIT',
              },
            },
            RECONCILER_ACTOR,
          );
          remediationRef = created.id;
        } catch (err: unknown) {
          remediationFailureJson = {
            code:
              err instanceof ConflictError
                ? 'CONFLICT'
                : err instanceof PolicyDeniedError
                  ? 'POLICY_DENIED'
                  : 'ERROR',
            message: err instanceof Error ? err.message : String(err),
          };
        }
      }

      await appendDriftRow({
        runId: run.id,
        adapterKey: 'ACH',
        kind: 'MISSING_LOCAL',
        severity: 'BLOCKING',
        externalRef: ref,
        detailJson: {
          increaseTransactionId: tx.id,
          amountCents: tx.amount,
          routeType: tx.route_type,
          description: tx.description,
        },
        remediation: remediationRef
          ? 'ENQUEUED_INSTRUCTION'
          : remediationFailureJson
            ? 'ALERT_RAISED'
            : 'NONE',
        remediationRef,
        remediationFailureJson,
      });
      driftCount++;
      continue;
    }

    // Exactly 1 match — compare amounts.
    const localInstruction = localMatches[0];
    const localCents = decimalStringToCents(localInstruction.amount);
    const remoteCents = BigInt(Math.abs(tx.amount));

    if (localCents !== remoteCents) {
      await appendDriftRow({
        runId: run.id,
        adapterKey: 'ACH',
        kind: 'AMOUNT_MISMATCH',
        severity: 'WARNING',
        externalRef: ref,
        instructionId: localInstruction.id,
        detailJson: {
          localAmount: localInstruction.amount,
          localCents: String(localCents),
          remoteAmountCents: tx.amount,
          remoteCents: String(remoteCents),
          localStatus: localInstruction.status,
        },
        remediation: 'NONE',
      });
      driftCount++;
      continue;
    }

    // ── Reconciliation-confirmed settlement for SUBMITTED instructions ──
    // When a SUBMITTED instruction has a matching remote transaction with
    // matching amount, the reconciliation run can finalize it to SETTLED
    // using the canonical externallySettleInstruction path. This is the
    // fallback path if the webhook was missed. Idempotent: if the
    // instruction was already settled by a prior webhook, the ConflictError
    // on terminal state is caught and logged as INFORMATIONAL.
    if (localInstruction.status === 'SUBMITTED' && !input.dryRun) {
      const idemKey = `recon:ach:confirm-submitted:${run.id}:${ref}`;
      let reconSettleOutcome: 'SETTLED' | 'ALREADY_TERMINAL' | 'ERROR' = 'ERROR';
      let reconSettleError: string | undefined;

      try {
        await externallySettleInstruction({
          instructionId: localInstruction.id,
          externalRef: ref,
          settledAt: tx.created_at ? new Date(tx.created_at) : new Date(),
          webhookEventId: `recon:${run.id}`,
          observedAmount: String(Math.abs(tx.amount)),
          actor: RECONCILER_ACTOR,
          correlationId: idemKey,
        });
        reconSettleOutcome = 'SETTLED';
      } catch (err: unknown) {
        if (err instanceof ConflictError && err.message.startsWith('external_settle_on_terminal')) {
          // Already settled (by webhook or prior recon run) — idempotent no-op.
          reconSettleOutcome = 'ALREADY_TERMINAL';
        } else {
          reconSettleError = err instanceof Error ? err.message : String(err);
        }
      }

      if (reconSettleOutcome === 'SETTLED') {
        await appendDriftRow({
          runId: run.id,
          adapterKey: 'ACH',
          kind: 'CONFIRMED_SUBMITTED',
          severity: 'INFORMATIONAL',
          externalRef: ref,
          instructionId: localInstruction.id,
          detailJson: {
            action: 'RECON_SETTLED',
            increaseTransactionId: tx.id,
            amountCents: tx.amount,
          },
          remediation: 'SETTLED_BY_RECON',
        });
      } else if (reconSettleOutcome === 'ALREADY_TERMINAL') {
        await appendDriftRow({
          runId: run.id,
          adapterKey: 'ACH',
          kind: 'CONFIRMED_SUBMITTED',
          severity: 'INFORMATIONAL',
          externalRef: ref,
          instructionId: localInstruction.id,
          detailJson: {
            action: 'ALREADY_SETTLED',
            increaseTransactionId: tx.id,
            note: 'Instruction already settled (likely by webhook); recon no-op.',
          },
          remediation: 'NONE',
        });
      } else {
        await appendDriftRow({
          runId: run.id,
          adapterKey: 'ACH',
          kind: 'RECON_SETTLE_FAILED',
          severity: 'BLOCKING',
          externalRef: ref,
          instructionId: localInstruction.id,
          detailJson: {
            action: 'SETTLE_FAILED',
            increaseTransactionId: tx.id,
            error: reconSettleError,
          },
          remediation: 'ALERT_RAISED',
        });
        driftCount++;
      }
    }
  }

  // ── Step 5: MISSING_REMOTE scan ───────────────────────────────────
  // Local-holding refs (DRYRUN-ACH-*, PENDING-APPROVAL-*) are INFORMATIONAL.
  // Real Increase transfer IDs with no remote match are BLOCKING drift.
  // SUBMITTED instructions with no remote match are BLOCKING (the transfer
  // was submitted to Increase but never appeared in the transaction feed).
  for (const [ref, instructions] of localByRef.entries()) {
    if (seenLocalRefs.has(ref)) continue;
    comparedCount++;

    for (const instruction of instructions) {
      const isHolding = isLocalHoldingRef(ref);
      const isSubmitted = instruction.status === 'SUBMITTED';

      // SUBMITTED + no remote = blocking drift (transfer submitted but not seen).
      // Holding refs = informational in all modes.
      const severity = isHolding ? 'INFORMATIONAL' : isSubmitted ? 'BLOCKING' : 'BLOCKING';

      await appendDriftRow({
        runId: run.id,
        adapterKey: 'ACH',
        kind: 'MISSING_REMOTE',
        severity,
        externalRef: ref,
        instructionId: instruction.id,
        detailJson: {
          isLocalHoldingRef: isHolding,
          isSubmitted,
          instructionStatus: instruction.status,
          instructionAmount: instruction.amount,
        },
        remediation: 'NONE',
      });
      if (!isHolding) driftCount++;
    }
  }

  return { comparedCount, driftCount };
}
