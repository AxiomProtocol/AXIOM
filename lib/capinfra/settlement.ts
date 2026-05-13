/**
 * Capital Infrastructure — Settlement service.
 *
 * Owns the canonical lifecycle for `cap_settlement_instructions`:
 *
 * Standard path (non-ACH and ACH DRY_RUN):
 *     PENDING → AUTHORIZED → EXECUTING → SETTLED
 *           ↓            ↓            ↓
 *        CANCELLED    CANCELLED     FAILED
 *
 * ACH MANUAL_APPROVAL path:
 *     PENDING → AUTHORIZED → PENDING_OPERATOR_APPROVAL → (approve) → SUBMITTED
 *                                                       → (reject)  → FAILED
 *                                                       → (timeout) → FAILED
 *
 * ACH LIVE_CANARY / LIVE path:
 *     PENDING → AUTHORIZED → SUBMITTED → (webhook/recon confirmation) → SETTLED
 *                          → FAILED (Increase API error)
 *                                      → FAILED (returned/reversed/declined)
 *
 * Contract invariants:
 *   - SUBMITTED ≠ bank-final. No portfolio writes on SUBMITTED.
 *     SUBMITTED means Increase production API accepted the transfer.
 *     Clearing is confirmed by webhook or reconciliation only.
 *   - No workflow may infer economic completion, reserve credit, treasury
 *     availability, or bank-final settlement from SUBMITTED status alone.
 *   - Terminal states (SETTLED, FAILED, CANCELLED) are immutable.
 *   - SUBMITTED → SETTLED requires explicit ACH settlement-confirming
 *     events only (transaction.created with matching externalRef + amount).
 *   - Portfolio writes happen ONLY inside the → SETTLED tx.
 *   - Notifications fan out AFTER the settlement transaction commits.
 *   - Adapters are reached only through adapters/registry.ts.
 *
 * Per §0.1 isolation rule: this file does not import any adapter
 * implementation directly. ACH mode is read via loadAchConfig().
 */

import { and, desc, eq, type SQL } from 'drizzle-orm';
import { db } from '../../server/db';
import {
  capSettlementInstructions,
  type CapSettlementInstruction,
  type NewCapSettlementInstruction,
  type CapAsset,
} from '../../shared/capInfraSchema';
import { generateId } from './ids';
import { ConflictError, NotFoundError, PolicyDeniedError } from './errors';
import { AdapterDisabledError } from './adapters/types';
import { emitAuditEventStrict } from './audit';
import { evaluatePolicy } from './policy';
import { getAssetById } from './assetRegistry';
import { getAdapter } from './adapters/registry';
import { applySettlement, reloadInstruction } from './portfolio';
import { dispatchNotifications as _dispatchNotifications } from './notifications';
import type { NotificationContext } from './notifications/subscriptions';
import type { SettlementCreateInput } from './types';
import type { UsdDecimalString } from './money';
import { loadAchConfig } from './adapters/ach/config';
import { recordSingleActorAction } from './adminActions';

// Re-export the canonical lifecycle ordering as a tuple for diagnostics.
export const SETTLEMENT_LIFECYCLE = [
  'PENDING',
  'AUTHORIZED',
  'EXECUTING',
  'SETTLED',
  'FAILED',
  'CANCELLED',
  'PENDING_OPERATOR_APPROVAL',
  'SUBMITTED',
] as const;

type Status = CapSettlementInstruction['status'];
const AVALANCHE_CHAIN_NAMES = new Set([
  'avalanche',
  'avalanche-c-chain',
  'avalanche-mainnet',
  'avalanche-fuji',
  'fuji',
]);

export const VALID_TRANSITIONS: Record<Status, Status[]> = {
  PENDING: ['AUTHORIZED', 'CANCELLED'],
  AUTHORIZED: ['EXECUTING', 'PENDING_OPERATOR_APPROVAL', 'SUBMITTED', 'CANCELLED'],
  // EXECUTING → SUBMITTED is allowed for non-ACH rails (e.g. EVM) whose
  // adapter dispatches asynchronously and returns receipt.submitted=true,
  // signalling the rail accepted the request but the result is not yet
  // chain-/bank-final. Final SETTLED requires a webhook or reconciliation
  // confirmation via externallySettleInstruction.
  EXECUTING: ['SETTLED', 'FAILED', 'SUBMITTED'],
  // PENDING_OPERATOR_APPROVAL: operator must approve (→ SUBMITTED) or reject (→ FAILED).
  PENDING_OPERATOR_APPROVAL: ['SUBMITTED', 'FAILED'],
  // SUBMITTED: bank-accepted but not bank-final. Transitions to SETTLED or FAILED
  // require webhook-confirmed or reconciliation-confirmed ACH settlement events.
  SUBMITTED: ['SETTLED', 'FAILED'],
  SETTLED: [],
  FAILED: [],
  CANCELLED: [],
};

function assertTransition(from: Status, to: Status): void {
  if (!VALID_TRANSITIONS[from].includes(to)) {
    throw new ConflictError(
      `invalid_settlement_transition:${from}->${to}`,
      { from, to, allowed: VALID_TRANSITIONS[from] },
    );
  }
}

// ─── Create (with policy gate + DB idempotency) ────────────────────

export async function createInstruction(
  input: SettlementCreateInput,
  actor: string,
): Promise<CapSettlementInstruction> {
  const existing = await getInstructionByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    if (
      existing.userId !== input.userId ||
      existing.assetId !== input.assetId ||
      existing.actionType !== input.actionType
    ) {
      throw new ConflictError('idempotency_key_collision', {
        key: input.idempotencyKey,
        storedFingerprint: {
          userId: existing.userId,
          assetId: existing.assetId,
          actionType: existing.actionType,
        },
        requestFingerprint: {
          userId: input.userId,
          assetId: input.assetId,
          actionType: input.actionType,
        },
      });
    }
    return existing;
  }

  // Policy gate.
  const policy = await evaluatePolicy(
    {
      userId: input.userId,
      assetId: input.assetId,
      actionType: input.actionType,
      amount: input.amount,
      correlationId: input.correlationId,
    },
    actor,
  );
  if (!policy.allowed) {
    throw new PolicyDeniedError(
      policy.reasonCode,
      `settlement denied by policy: ${policy.reasonCode}`,
      { policyDecisionId: policy.decisionId, requiredClaims: policy.requiredClaims },
    );
  }

  const id = generateId('si');
  const row: NewCapSettlementInstruction = {
    id,
    userId: input.userId,
    assetId: input.assetId,
    actionType: input.actionType,
    routeType: input.routeType ?? 'DIRECT',
    settlementType: input.settlementType,
    amount: input.amount,
    quoteCurrency: input.quoteCurrency ?? 'USD',
    counterpartyId: input.counterpartyId ?? null,
    adapterId: input.adapterId ?? null,
    externalRef: input.externalRef ?? null,
    idempotencyKey: input.idempotencyKey,
    status: 'PENDING',
    policyDecisionId: policy.decisionId,
    payloadJson: (input.payloadJson ?? null) as Record<string, unknown> | null,
  };

  const persisted = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(capSettlementInstructions)
      .values(row)
      .onConflictDoNothing({ target: capSettlementInstructions.idempotencyKey })
      .returning();
    if (inserted.length === 0) return null;
    const created = inserted[0];
    await emitAuditEventStrict(
      {
        eventType: 'settlement.created',
        aggregateType: 'settlement_instruction',
        aggregateId: created.id,
        userId: created.userId,
        assetId: created.assetId,
        instructionId: created.id,
        actor,
        correlationId: input.correlationId ?? null,
        payloadJson: {
          actionType: created.actionType,
          settlementType: created.settlementType,
          amount: created.amount,
          policyDecisionId: created.policyDecisionId,
        },
      },
      tx,
    );
    return created;
  });

  if (!persisted) {
    const winner = await getInstructionByIdempotencyKey(input.idempotencyKey);
    if (!winner) throw new Error('settlement idempotency conflict but no winner row found');
    if (
      winner.userId !== input.userId ||
      winner.assetId !== input.assetId ||
      winner.actionType !== input.actionType
    ) {
      throw new ConflictError('idempotency_key_collision', {
        key: input.idempotencyKey,
        storedFingerprint: {
          userId: winner.userId,
          assetId: winner.assetId,
          actionType: winner.actionType,
        },
        requestFingerprint: {
          userId: input.userId,
          assetId: input.assetId,
          actionType: input.actionType,
        },
      });
    }
    return winner;
  }

  await _dispatchNotifications(await buildCtx(persisted, 'settlement.created', input.correlationId));
  return persisted;
}

// ─── Authorize ─────────────────────────────────────────────────────

export async function authorizeInstruction(
  instructionId: string,
  actor: string,
  correlationId?: string,
): Promise<CapSettlementInstruction> {
  const pre = await getInstruction(instructionId);
  if (!pre) throw new NotFoundError(`instruction ${instructionId} not found`);
  if (pre.status !== 'PENDING') {
    assertTransition(pre.status, 'AUTHORIZED');
  }

  // Policy re-evaluated at AUTHORIZE time. Pass productContext='ACH' for
  // ACH-typed instructions so the policy evaluator applies ACH-specific
  // mutable-state gates (caps, recon-overdue, emergency-disable freeze).
  const isAch = pre.settlementType === 'ACH';
  const policy = await evaluatePolicy(
    {
      userId: pre.userId,
      assetId: pre.assetId,
      actionType: pre.actionType,
      amount: pre.amount,
      correlationId: correlationId ?? undefined,
      productContext: isAch ? 'ACH' : undefined,
    },
    actor,
  );
  if (!policy.allowed) {
    const failed = await db.transaction(async (tx) => {
      const current = await reloadInstruction(tx, instructionId);
      if (!current) throw new NotFoundError(`instruction ${instructionId} not found`);
      if (current.status !== 'PENDING') {
        assertTransition(current.status, 'AUTHORIZED');
      }
      const [next] = await tx
        .update(capSettlementInstructions)
        .set({ status: 'FAILED', updatedAt: new Date(), policyDecisionId: policy.decisionId })
        .where(eq(capSettlementInstructions.id, instructionId))
        .returning();
      await emitAuditEventStrict(
        {
          eventType: 'settlement.failed',
          aggregateType: 'settlement_instruction',
          aggregateId: instructionId,
          userId: next.userId,
          assetId: next.assetId,
          instructionId: next.id,
          actor,
          correlationId: correlationId ?? null,
          payloadJson: {
            reason: 'policy_denied_at_authorize',
            reasonCode: policy.reasonCode,
            policyDecisionId: policy.decisionId,
          },
        },
        tx,
      );
      return next;
    });
    await _dispatchNotifications(
      await buildCtx(failed, 'settlement.failed', correlationId, policy.reasonCode),
    );
    throw new PolicyDeniedError(
      policy.reasonCode,
      `authorize denied by policy: ${policy.reasonCode}`,
      { policyDecisionId: policy.decisionId, requiredClaims: policy.requiredClaims },
    );
  }

  const updated = await db.transaction(async (tx) => {
    const current = await reloadInstruction(tx, instructionId);
    if (!current) throw new NotFoundError(`instruction ${instructionId} not found`);
    assertTransition(current.status, 'AUTHORIZED');
    const [next] = await tx
      .update(capSettlementInstructions)
      .set({
        status: 'AUTHORIZED',
        authorizedAt: new Date(),
        updatedAt: new Date(),
        policyDecisionId: policy.decisionId,
      })
      .where(eq(capSettlementInstructions.id, instructionId))
      .returning();
    await emitAuditEventStrict(
      {
        eventType: 'settlement.authorized',
        aggregateType: 'settlement_instruction',
        aggregateId: instructionId,
        userId: next.userId,
        assetId: next.assetId,
        instructionId: next.id,
        actor,
        correlationId: correlationId ?? null,
        payloadJson: { policyDecisionId: policy.decisionId, productContext: isAch ? 'ACH' : null },
      },
      tx,
    );
    return next;
  });
  await _dispatchNotifications(await buildCtx(updated, 'settlement.authorized', correlationId));
  return updated;
}

// ─── Execute (drives ACH routing + EXECUTING → SETTLED|FAILED) ─────

export async function executeInstruction(
  instructionId: string,
  actor: string,
  correlationId?: string,
): Promise<CapSettlementInstruction> {
  // Step 0: Rail-isolation pre-flight.
  const pre = await getInstruction(instructionId);
  if (!pre) throw new NotFoundError(`instruction ${instructionId} not found`);
  const asset = await getAssetById(pre.assetId);
  if (!asset) throw new NotFoundError(`asset ${pre.assetId} not found`);
  if (asset.settlementType !== pre.settlementType) {
    const failed = await db.transaction(async (tx) => {
      const current = await reloadInstruction(tx, instructionId);
      if (!current) throw new NotFoundError(`instruction ${instructionId} not found`);
      if (current.status !== 'AUTHORIZED' && current.status !== 'PENDING') {
        assertTransition(current.status, 'EXECUTING');
      }
      const [next] = await tx
        .update(capSettlementInstructions)
        .set({ status: 'FAILED', updatedAt: new Date() })
        .where(eq(capSettlementInstructions.id, instructionId))
        .returning();
      await emitAuditEventStrict(
        {
          eventType: 'settlement.failed',
          aggregateType: 'settlement_instruction',
          aggregateId: instructionId,
          userId: next.userId,
          assetId: next.assetId,
          instructionId: next.id,
          actor,
          correlationId: correlationId ?? null,
          payloadJson: {
            reason: 'rail_mismatch',
            assetSettlementType: asset.settlementType,
            instructionSettlementType: current.settlementType,
          },
        },
        tx,
      );
      return next;
    });
    await _dispatchNotifications(
      await buildCtx(failed, 'settlement.failed', correlationId, 'rail_mismatch'),
    );
    throw new ConflictError('rail_mismatch', {
      assetSettlementType: asset.settlementType,
      instructionSettlementType: pre.settlementType,
      assetId: asset.id,
      instructionId,
    });
  }

  // ── ACH mode-specific routing ─────────────────────────────────────
  // ACH instructions are routed before the EXECUTING transition based on the
  // current adapter mode. The dispatcher IS NOT called for MANUAL_APPROVAL
  // (no Increase API call — instruction parks to PENDING_OPERATOR_APPROVAL).
  // For LIVE_CANARY/LIVE, the dispatcher calls Increase and returns
  // submitted=true, which routes to SUBMITTED (no portfolio write).
  if (pre.settlementType === 'ACH') {
    return _executeAchInstruction(pre, asset, actor, correlationId);
  }

  // ── Non-ACH: existing EXECUTING → SETTLED path ───────────────────

  const executing = await db.transaction(async (tx) => {
    const current = await reloadInstruction(tx, instructionId);
    if (!current) throw new NotFoundError(`instruction ${instructionId} not found`);
    assertTransition(current.status, 'EXECUTING');
    const [next] = await tx
      .update(capSettlementInstructions)
      .set({ status: 'EXECUTING', updatedAt: new Date() })
      .where(eq(capSettlementInstructions.id, instructionId))
      .returning();
    await emitAuditEventStrict(
      {
        eventType: 'settlement.executing',
        aggregateType: 'settlement_instruction',
        aggregateId: instructionId,
        userId: next.userId,
        assetId: next.assetId,
        instructionId: next.id,
        actor,
        correlationId: correlationId ?? null,
      },
      tx,
    );
    return next;
  });
  await _dispatchNotifications(await buildCtx(executing, 'settlement.executing', correlationId));

  const adapter = getAdapter(resolveAdapterKind(asset));
  let receipt;
  try {
    receipt = await adapter.dispatch({ instruction: executing, asset });
  } catch (err) {
    const failed = await db.transaction(async (tx) => {
      const [next] = await tx
        .update(capSettlementInstructions)
        .set({ status: 'FAILED', updatedAt: new Date() })
        .where(eq(capSettlementInstructions.id, instructionId))
        .returning();
      await emitAuditEventStrict(
        {
          eventType: 'settlement.failed',
          aggregateType: 'settlement_instruction',
          aggregateId: instructionId,
          userId: next.userId,
          assetId: next.assetId,
          instructionId: next.id,
          actor,
          correlationId: correlationId ?? null,
          payloadJson: { error: (err as Error).message ?? String(err) },
        },
        tx,
      );
      return next;
    });
    await _dispatchNotifications(
      await buildCtx(failed, 'settlement.failed', correlationId, (err as Error).message),
    );
    return failed;
  }

  // ── Receipt routing ──────────────────────────────────────────────
  // If the adapter returned receipt.submitted=true, the rail accepted
  // the request but the result is not yet chain-/bank-final. Park the
  // instruction at SUBMITTED with NO portfolio write. SETTLED requires
  // a webhook or reconciliation confirmation via
  // externallySettleInstruction. This protects against re-orgs (raw
  // EVM) and any other rail with delayed finality.
  if (receipt.submitted) {
    const submitted = await db.transaction(async (tx) => {
      const current = await reloadInstruction(tx, instructionId);
      if (!current) throw new NotFoundError(`instruction ${instructionId} vanished mid-submit`);
      assertTransition(current.status, 'SUBMITTED');
      const [next] = await tx
        .update(capSettlementInstructions)
        .set({
          status: 'SUBMITTED',
          externalRef: receipt.externalRef,
          updatedAt: new Date(),
          payloadJson: {
            ...(current.payloadJson as Record<string, unknown> | null ?? {}),
            adapterReceipt: receipt.receiptJson ?? null,
          },
        })
        .where(eq(capSettlementInstructions.id, instructionId))
        .returning();
      // No applySettlement — SUBMITTED ≠ chain-/bank-final. Portfolio write blocked.
      await emitAuditEventStrict(
        {
          eventType: 'settlement.submitted',
          aggregateType: 'settlement_instruction',
          aggregateId: instructionId,
          userId: next.userId,
          assetId: next.assetId,
          instructionId: next.id,
          actor,
          correlationId: correlationId ?? null,
          payloadJson: {
            externalRef: receipt.externalRef,
            settlementType: asset.settlementType,
            note: 'SUBMITTED means the rail accepted dispatch. Final SETTLED requires confirmation via externallySettleInstruction.',
          },
        },
        tx,
      );
      return next;
    });
    await _dispatchNotifications(
      await buildCtx(submitted, 'settlement.submitted', correlationId),
    );
    return submitted;
  }

  // SETTLED — atomic with portfolio + ledger writes (default branch
  // for fast-final adapters: INTERNAL, STELLAR, etc.).
  const settled = await db.transaction(async (tx) => {
    const current = await reloadInstruction(tx, instructionId);
    if (!current) throw new NotFoundError(`instruction ${instructionId} vanished mid-settle`);
    if (current.status !== 'EXECUTING') {
      throw new ConflictError(
        `invalid_settlement_transition:${current.status}->SETTLED`,
        { from: current.status, to: 'SETTLED' },
      );
    }
    const [next] = await tx
      .update(capSettlementInstructions)
      .set({
        status: 'SETTLED',
        externalRef: receipt.externalRef,
        settledAt: receipt.settledAt,
        updatedAt: new Date(),
        payloadJson: {
          ...(current.payloadJson as Record<string, unknown> | null ?? {}),
          adapterReceipt: receipt.receiptJson ?? null,
        },
      })
      .where(eq(capSettlementInstructions.id, instructionId))
      .returning();
    await applySettlement(tx, next, asset, actor);
    await emitAuditEventStrict(
      {
        eventType: 'settlement.settled',
        aggregateType: 'settlement_instruction',
        aggregateId: instructionId,
        userId: next.userId,
        assetId: next.assetId,
        instructionId: next.id,
        actor,
        correlationId: correlationId ?? null,
        payloadJson: { externalRef: receipt.externalRef, settledAt: receipt.settledAt.toISOString() },
      },
      tx,
    );
    return next;
  });
  await _dispatchNotifications(await buildCtx(settled, 'settlement.settled', correlationId));
  return settled;
}

function resolveAdapterKind(asset: CapAsset): string {
  if (asset.settlementType !== 'EVM') return asset.settlementType;

  const chain = (asset.chain ?? '').toLowerCase();
  if (AVALANCHE_CHAIN_NAMES.has(chain)) return 'AVALANCHE';

  const chainId = asset.chainId ?? null;
  if (chainId === 43113 || chainId === 43114) return 'AVALANCHE';

  return 'EVM';
}

// ── ACH instruction executor (mode-aware) ─────────────────────────

async function _executeAchInstruction(
  pre: CapSettlementInstruction,
  asset: CapAsset,
  actor: string,
  correlationId?: string,
): Promise<CapSettlementInstruction> {
  const { id: instructionId } = pre;

  const achCfg = await loadAchConfig();
  if (!achCfg) {
    // No active ACH adapter — park to FAILED.
    return _failInstruction(instructionId, actor, correlationId, 'no_active_ach_adapter');
  }

  const mode = achCfg.mode;

  // DISABLED: reject immediately (single-actor, no Increase call).
  if (mode === 'DISABLED') {
    return _failInstruction(instructionId, actor, correlationId, 'ach_adapter_disabled');
  }

  // MANUAL_APPROVAL: park to PENDING_OPERATOR_APPROVAL. No Increase call.
  if (mode === 'MANUAL_APPROVAL') {
    const parked = await db.transaction(async (tx) => {
      const current = await reloadInstruction(tx, instructionId);
      if (!current) throw new NotFoundError(`instruction ${instructionId} not found`);
      assertTransition(current.status, 'PENDING_OPERATOR_APPROVAL');
      const [next] = await tx
        .update(capSettlementInstructions)
        .set({ status: 'PENDING_OPERATOR_APPROVAL', updatedAt: new Date() })
        .where(eq(capSettlementInstructions.id, instructionId))
        .returning();
      await emitAuditEventStrict(
        {
          eventType: 'settlement.pending_operator_approval',
          aggregateType: 'settlement_instruction',
          aggregateId: instructionId,
          userId: next.userId,
          assetId: next.assetId,
          instructionId: next.id,
          actor,
          correlationId: correlationId ?? null,
          payloadJson: { achMode: mode, adapterRowId: achCfg.rowId },
        },
        tx,
      );
      return next;
    });
    await _dispatchNotifications(
      await buildCtx(parked, 'settlement.pending_operator_approval', correlationId),
    );
    return parked;
  }

  // DRY_RUN / LIVE_CANARY / LIVE: dispatch through adapter.
  // The dispatcher returns pendingApproval / submitted flags.
  const adapter = getAdapter('ACH');
  const dispatchingInstruction = pre; // already AUTHORIZED, no EXECUTING transition for ACH

  let receipt;
  try {
    receipt = await adapter.dispatch({ instruction: dispatchingInstruction, asset });
  } catch (err) {
    if (err instanceof AdapterDisabledError) {
      return _failInstruction(instructionId, actor, correlationId, 'ach_adapter_disabled');
    }
    return _failInstruction(
      instructionId,
      actor,
      correlationId,
      (err as Error).message ?? String(err),
    );
  }

  // DRY_RUN → SETTLED (existing behavior; no pendingApproval/submitted flag).
  if (!receipt.pendingApproval && !receipt.submitted) {
    const settled = await db.transaction(async (tx) => {
      const current = await reloadInstruction(tx, instructionId);
      if (!current) throw new NotFoundError(`instruction ${instructionId} vanished`);
      // DRY_RUN skips EXECUTING; transition directly AUTHORIZED → SETTLED.
      if (current.status !== 'AUTHORIZED') {
        throw new ConflictError(
          `ach_dry_run_settle_requires_authorized:${current.status}`,
          { from: current.status, to: 'SETTLED' },
        );
      }
      const [next] = await tx
        .update(capSettlementInstructions)
        .set({
          status: 'SETTLED',
          externalRef: receipt.externalRef,
          settledAt: receipt.settledAt,
          updatedAt: new Date(),
          payloadJson: {
            ...(current.payloadJson as Record<string, unknown> | null ?? {}),
            adapterReceipt: receipt.receiptJson ?? null,
          },
        })
        .where(eq(capSettlementInstructions.id, instructionId))
        .returning();
      await applySettlement(tx, next, asset, actor);
      await emitAuditEventStrict(
        {
          eventType: 'settlement.settled',
          aggregateType: 'settlement_instruction',
          aggregateId: instructionId,
          userId: next.userId,
          assetId: next.assetId,
          instructionId: next.id,
          actor,
          correlationId: correlationId ?? null,
          payloadJson: {
            achMode: 'DRY_RUN',
            externalRef: receipt.externalRef,
            settledAt: receipt.settledAt.toISOString(),
          },
        },
        tx,
      );
      return next;
    });
    await _dispatchNotifications(await buildCtx(settled, 'settlement.settled', correlationId));
    return settled;
  }

  // LIVE_CANARY / LIVE: receipt.submitted=true → SUBMITTED.
  // SUBMITTED ≠ bank-final. No portfolio writes.
  if (receipt.submitted) {
    const submitted = await db.transaction(async (tx) => {
      const current = await reloadInstruction(tx, instructionId);
      if (!current) throw new NotFoundError(`instruction ${instructionId} vanished`);
      if (current.status !== 'AUTHORIZED') {
        throw new ConflictError(
          `ach_submit_requires_authorized:${current.status}`,
          { from: current.status, to: 'SUBMITTED' },
        );
      }
      const [next] = await tx
        .update(capSettlementInstructions)
        .set({
          status: 'SUBMITTED',
          externalRef: receipt.externalRef,
          updatedAt: new Date(),
          payloadJson: {
            ...(current.payloadJson as Record<string, unknown> | null ?? {}),
            adapterReceipt: receipt.receiptJson ?? null,
          },
        })
        .where(eq(capSettlementInstructions.id, instructionId))
        .returning();
      // No applySettlement — SUBMITTED ≠ bank-final. Portfolio write blocked.
      await emitAuditEventStrict(
        {
          eventType: 'settlement.submitted',
          aggregateType: 'settlement_instruction',
          aggregateId: instructionId,
          userId: next.userId,
          assetId: next.assetId,
          instructionId: next.id,
          actor,
          correlationId: correlationId ?? null,
          payloadJson: {
            achMode: mode,
            externalRef: receipt.externalRef,
            note: 'SUBMITTED means Increase accepted. Clearing confirmed by reconciliation only.',
          },
        },
        tx,
      );
      return next;
    });
    await _dispatchNotifications(await buildCtx(submitted, 'settlement.submitted', correlationId));
    return submitted;
  }

  // Shouldn't be reached; guard for unexpected dispatcher responses.
  throw new ConflictError('ach_dispatch_unexpected_result', {
    instructionId,
    receiptKeys: Object.keys(receipt),
  });
}

// ─── ACH Operator Approval (PENDING_OPERATOR_APPROVAL → SUBMITTED) ──

export interface AchApproveInput {
  instructionId: string;
  actor: string;
  correlationId?: string;
}

/**
 * Approve a PENDING_OPERATOR_APPROVAL instruction.
 * Calls the Increase API via the adapter (LIVE_CANARY/LIVE mode) and
 * transitions to SUBMITTED. No portfolio write.
 *
 * Only valid when the instruction is in PENDING_OPERATOR_APPROVAL status.
 * Records a single-actor admin action (ach.approval).
 */
export async function approveAchInstruction(
  input: AchApproveInput,
): Promise<CapSettlementInstruction> {
  const { instructionId, actor, correlationId } = input;
  const pre = await getInstruction(instructionId);
  if (!pre) throw new NotFoundError(`instruction ${instructionId} not found`);
  assertTransition(pre.status, 'SUBMITTED'); // PENDING_OPERATOR_APPROVAL → SUBMITTED

  if (pre.settlementType !== 'ACH') {
    throw new ConflictError('approve_requires_ach_instruction', { settlementType: pre.settlementType });
  }

  const asset = await getAssetById(pre.assetId);
  if (!asset) throw new NotFoundError(`asset ${pre.assetId} not found`);

  const achCfg = await loadAchConfig();
  if (!achCfg) throw new ConflictError('no_active_ach_adapter', {});
  if (achCfg.mode === 'DISABLED') {
    throw new ConflictError('ach_adapter_disabled_during_approve', {});
  }

  // Approval-time dispatch must perform a real submission and must not route
  // through the MANUAL_APPROVAL pendingApproval branch.
  const adapter = getAdapter('ACH');
  if (!adapter.dispatchAfterApproval) {
    throw new ConflictError('ach_adapter_missing_approval_dispatch', {});
  }
  let receipt;
  try {
    receipt = await adapter.dispatchAfterApproval({ instruction: pre, asset });
  } catch (err) {
    await recordSingleActorAction({
      actionType: 'ach.rejection',
      subjectType: 'settlement_instruction',
      subjectId: instructionId,
      actor,
      reasonCode: 'approve_dispatch_failed',
      payload: { error: (err as Error).message, instructionId },
      correlationId: correlationId ?? null,
    });
    return _failInstruction(instructionId, actor, correlationId, `approve_dispatch_failed:${(err as Error).message}`);
  }
  if (!receipt.submitted || receipt.pendingApproval) {
    throw new ConflictError('approve_dispatch_must_submit_once', {
      instructionId,
      submitted: Boolean(receipt.submitted),
      pendingApproval: Boolean(receipt.pendingApproval),
    });
  }

  // Record approval action.
  await recordSingleActorAction({
    actionType: 'ach.approval',
    subjectType: 'settlement_instruction',
    subjectId: instructionId,
    actor,
    reasonCode: 'operator_approved',
    payload: { externalRef: receipt.externalRef, achMode: achCfg.mode },
    correlationId: correlationId ?? null,
  });

  // Transition to SUBMITTED.
  const submitted = await db.transaction(async (tx) => {
    const current = await reloadInstruction(tx, instructionId);
    if (!current) throw new NotFoundError(`instruction ${instructionId} vanished`);
    if (current.status !== 'PENDING_OPERATOR_APPROVAL') {
      throw new ConflictError(
        `approve_requires_pending_operator_approval:${current.status}`,
        { from: current.status, instructionId },
      );
    }
    const [next] = await tx
      .update(capSettlementInstructions)
      .set({
        status: 'SUBMITTED',
        externalRef: receipt.externalRef,
        updatedAt: new Date(),
        payloadJson: {
          ...(current.payloadJson as Record<string, unknown> | null ?? {}),
          adapterReceipt: receipt.receiptJson ?? null,
          approvedBy: actor,
          approvedAt: new Date().toISOString(),
        },
      })
      .where(eq(capSettlementInstructions.id, instructionId))
      .returning();
    // No applySettlement — SUBMITTED ≠ bank-final.
    await emitAuditEventStrict(
      {
        eventType: 'settlement.submitted',
        aggregateType: 'settlement_instruction',
        aggregateId: instructionId,
        userId: next.userId,
        assetId: next.assetId,
        instructionId: next.id,
        actor,
        correlationId: correlationId ?? null,
        payloadJson: {
          source: 'operator_approval',
          externalRef: receipt.externalRef,
          note: 'Approved by operator. SUBMITTED means Increase accepted. Clearing by reconciliation only.',
        },
      },
      tx,
    );
    return next;
  });
  await _dispatchNotifications(await buildCtx(submitted, 'settlement.submitted', correlationId));
  return submitted;
}

// ─── ACH Operator Rejection (PENDING_OPERATOR_APPROVAL → FAILED) ───

export interface AchRejectInput {
  instructionId: string;
  actor: string;
  reasonCode: string;
  correlationId?: string;
}

/**
 * Reject a PENDING_OPERATOR_APPROVAL instruction → FAILED.
 * No Increase API call. Records a single-actor admin action (ach.rejection).
 * Safe to auto-fail on rollback (no Increase transfer was submitted).
 */
export async function rejectAchInstruction(
  input: AchRejectInput,
): Promise<CapSettlementInstruction> {
  const { instructionId, actor, reasonCode, correlationId } = input;
  const pre = await getInstruction(instructionId);
  if (!pre) throw new NotFoundError(`instruction ${instructionId} not found`);
  assertTransition(pre.status, 'FAILED'); // PENDING_OPERATOR_APPROVAL → FAILED

  if (pre.settlementType !== 'ACH') {
    throw new ConflictError('reject_requires_ach_instruction', { settlementType: pre.settlementType });
  }

  await recordSingleActorAction({
    actionType: 'ach.rejection',
    subjectType: 'settlement_instruction',
    subjectId: instructionId,
    actor,
    reasonCode,
    payload: { instructionId, source: 'operator_rejection' },
    correlationId: correlationId ?? null,
  });

  return _failInstruction(instructionId, actor, correlationId, `operator_rejected:${reasonCode}`);
}

// ─── Sweep-timeouts (cron: PENDING_OPERATOR_APPROVAL → FAILED) ─────

export interface SweepTimeoutsResult {
  sweptCount: number;
  instructionIds: string[];
  actor: string;
  cutoffMs: number;
}

/**
 * Fail all PENDING_OPERATOR_APPROVAL ACH instructions older than
 * timeoutMinutes. Called by the sweep-timeouts endpoint (cron/admin).
 * Records a single-actor admin action (ach.sweep_timeouts) for each
 * swept instruction.
 *
 * Safety: SUBMITTED instructions are NEVER swept (they require operator
 * review + reconciliation). Only PENDING_OPERATOR_APPROVAL is eligible.
 */
export async function sweepAchTimeouts(opts: {
  timeoutMinutes: number;
  actor: string;
  correlationId?: string;
}): Promise<SweepTimeoutsResult> {
  const cutoff = new Date(Date.now() - opts.timeoutMinutes * 60 * 1000);

  const eligible = await db
    .select({ id: capSettlementInstructions.id })
    .from(capSettlementInstructions)
    .where(
      and(
        eq(capSettlementInstructions.status, 'PENDING_OPERATOR_APPROVAL'),
        eq(capSettlementInstructions.settlementType, 'ACH'),
      ),
    );

  // Filter to those older than cutoff (createdAt < cutoff).
  const stale = await db
    .select()
    .from(capSettlementInstructions)
    .where(
      and(
        eq(capSettlementInstructions.status, 'PENDING_OPERATOR_APPROVAL'),
        eq(capSettlementInstructions.settlementType, 'ACH'),
      ),
    );
  const toSweep = stale.filter((r) => r.updatedAt < cutoff || r.createdAt < cutoff);

  const sweptIds: string[] = [];
  for (const row of toSweep) {
    await recordSingleActorAction({
      actionType: 'ach.sweep_timeouts',
      subjectType: 'settlement_instruction',
      subjectId: row.id,
      actor: opts.actor,
      reasonCode: 'approval_timeout',
      payload: {
        timeoutMinutes: opts.timeoutMinutes,
        cutoffIso: cutoff.toISOString(),
        instructionAge: Date.now() - row.createdAt.getTime(),
      },
      correlationId: opts.correlationId ?? null,
    });
    await _failInstruction(row.id, opts.actor, opts.correlationId, 'approval_timeout');
    sweptIds.push(row.id);
  }

  return {
    sweptCount: sweptIds.length,
    instructionIds: sweptIds,
    actor: opts.actor,
    cutoffMs: cutoff.getTime(),
  };
}

// ─── External settlement (webhook-confirmed rail) ──────────────────

export interface ExternalSettleInput {
  instructionId: string;
  externalRef: string;
  settledAt: Date;
  webhookEventId: string;
  observedAmount?: UsdDecimalString;
  observedAsset?: string;
  actor: string;
  correlationId?: string;
}

export async function externallySettleInstruction(
  input: ExternalSettleInput,
): Promise<CapSettlementInstruction> {
  const { instructionId, externalRef, settledAt, webhookEventId, actor, correlationId } = input;

  const pre = await getInstruction(instructionId);
  if (!pre) throw new NotFoundError(`instruction ${instructionId} not found`);

  const TERMINAL: Status[] = ['SETTLED', 'FAILED', 'CANCELLED'];
  if (TERMINAL.includes(pre.status)) {
    throw new ConflictError(
      `external_settle_on_terminal:${pre.status}`,
      { instructionId, currentStatus: pre.status, webhookEventId },
    );
  }
  // Accept AUTHORIZED (Stellar/non-ACH path) and SUBMITTED (ACH confirmation path).
  const ELIGIBLE_STATUSES: Status[] = ['AUTHORIZED', 'SUBMITTED'];
  if (!ELIGIBLE_STATUSES.includes(pre.status)) {
    throw new ConflictError(
      `external_settle_requires_authorized_or_submitted:${pre.status}`,
      { instructionId, currentStatus: pre.status, webhookEventId },
    );
  }

  const asset = await getAssetById(pre.assetId);
  if (!asset) throw new NotFoundError(`asset ${pre.assetId} not found`);

  const settled = await db.transaction(async (tx) => {
    const current = await reloadInstruction(tx, instructionId);
    if (!current) throw new NotFoundError(`instruction ${instructionId} vanished`);
    if (TERMINAL.includes(current.status)) {
      throw new ConflictError(
        `external_settle_on_terminal:${current.status}`,
        { instructionId, currentStatus: current.status, webhookEventId },
      );
    }
    if (!ELIGIBLE_STATUSES.includes(current.status)) {
      throw new ConflictError(
        `external_settle_requires_authorized_or_submitted:${current.status}`,
        { instructionId, currentStatus: current.status, webhookEventId },
      );
    }

    // For SUBMITTED → SETTLED (ACH confirmation): skip the intermediate
    // EXECUTING step. The instruction already passed through the dispatch
    // gate when it was first submitted to Increase. Transition directly
    // to SETTLED.
    const fromSubmitted = current.status === 'SUBMITTED';

    if (!fromSubmitted) {
      // AUTHORIZED path (Stellar / non-ACH): transition via EXECUTING.
      await tx
        .update(capSettlementInstructions)
        .set({ status: 'EXECUTING', updatedAt: new Date() })
        .where(eq(capSettlementInstructions.id, instructionId));
      await emitAuditEventStrict(
        {
          eventType: 'settlement.executing',
          aggregateType: 'settlement_instruction',
          aggregateId: instructionId,
          userId: current.userId,
          assetId: current.assetId,
          instructionId,
          actor,
          correlationId: correlationId ?? null,
          payloadJson: { source: 'external_webhook', webhookEventId },
        },
        tx,
      );
    }

    const [next] = await tx
      .update(capSettlementInstructions)
      .set({
        status: 'SETTLED',
        externalRef,
        settledAt,
        updatedAt: new Date(),
        payloadJson: {
          ...(current.payloadJson as Record<string, unknown> | null ?? {}),
          webhookEventId,
          observedAmount: input.observedAmount ?? null,
          observedAsset: input.observedAsset ?? null,
          ...(fromSubmitted ? { confirmedFromSubmitted: true } : {}),
        },
      })
      .where(eq(capSettlementInstructions.id, instructionId))
      .returning();
    await applySettlement(tx, next, asset, actor);
    await emitAuditEventStrict(
      {
        eventType: 'settlement.settled',
        aggregateType: 'settlement_instruction',
        aggregateId: instructionId,
        userId: next.userId,
        assetId: next.assetId,
        instructionId: next.id,
        actor,
        correlationId: correlationId ?? null,
        payloadJson: {
          source: fromSubmitted ? 'ach_confirmation' : 'external_webhook',
          externalRef,
          settledAt: settledAt.toISOString(),
          webhookEventId,
          fromSubmitted,
        },
      },
      tx,
    );
    return next;
  });
  await _dispatchNotifications(await buildCtx(settled, 'settlement.settled', correlationId));
  return settled;
}


// ─── Read by external ref (reconciliation + webhook processor) ──────

/**
 * Returns all instructions that match a given external rail reference
 * (e.g., Stellar tx hash). Normally at most one row exists, but the
 * ambiguous-match check in the webhook processor needs the count to
 * decide whether to proceed or emit a MANUAL_INTERVENTION drift.
 */
export async function getInstructionsByExternalRef(
  externalRef: string,
  settlementType?: string,
): Promise<CapSettlementInstruction[]> {
  const conditions: SQL[] = [eq(capSettlementInstructions.externalRef, externalRef)];
  if (settlementType) {
    conditions.push(eq(capSettlementInstructions.settlementType, settlementType as any));
  }
  return db
    .select()
    .from(capSettlementInstructions)
    .where(and(...conditions));
}

// ─── Cancel ────────────────────────────────────────────────────────

export async function cancelInstruction(
  instructionId: string,
  actor: string,
  correlationId?: string,
): Promise<CapSettlementInstruction> {
  const updated = await db.transaction(async (tx) => {
    const current = await reloadInstruction(tx, instructionId);
    if (!current) throw new NotFoundError(`instruction ${instructionId} not found`);
    assertTransition(current.status, 'CANCELLED');
    const [next] = await tx
      .update(capSettlementInstructions)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(capSettlementInstructions.id, instructionId))
      .returning();
    await emitAuditEventStrict(
      {
        eventType: 'settlement.cancelled',
        aggregateType: 'settlement_instruction',
        aggregateId: instructionId,
        userId: next.userId,
        assetId: next.assetId,
        instructionId: next.id,
        actor,
        correlationId: correlationId ?? null,
      },
      tx,
    );
    return next;
  });
  await _dispatchNotifications(await buildCtx(updated, 'settlement.cancelled', correlationId));
  return updated;
}

// ─── Internal helpers ───────────────────────────────────────────────

async function _failInstruction(
  instructionId: string,
  actor: string,
  correlationId: string | undefined,
  reason: string,
): Promise<CapSettlementInstruction> {
  const failed = await db.transaction(async (tx) => {
    const current = await reloadInstruction(tx, instructionId);
    if (!current) throw new NotFoundError(`instruction ${instructionId} not found`);
    // Only fail from non-terminal states.
    if (['SETTLED', 'FAILED', 'CANCELLED'].includes(current.status)) {
      throw new ConflictError(`fail_on_terminal:${current.status}`, { instructionId });
    }
    const [next] = await tx
      .update(capSettlementInstructions)
      .set({ status: 'FAILED', updatedAt: new Date() })
      .where(eq(capSettlementInstructions.id, instructionId))
      .returning();
    await emitAuditEventStrict(
      {
        eventType: 'settlement.failed',
        aggregateType: 'settlement_instruction',
        aggregateId: instructionId,
        userId: next.userId,
        assetId: next.assetId,
        instructionId: next.id,
        actor,
        correlationId: correlationId ?? null,
        payloadJson: { error: reason },
      },
      tx,
    );
    return next;
  });
  await _dispatchNotifications(await buildCtx(failed, 'settlement.failed', correlationId, reason));
  return failed;
}

// ─── Read helpers ───────────────────────────────────────────────────

export async function getInstruction(id: string): Promise<CapSettlementInstruction | null> {
  const [row] = await db
    .select()
    .from(capSettlementInstructions)
    .where(eq(capSettlementInstructions.id, id))
    .limit(1);
  return row ?? null;
}

async function getInstructionByIdempotencyKey(key: string): Promise<CapSettlementInstruction | null> {
  const [row] = await db
    .select()
    .from(capSettlementInstructions)
    .where(eq(capSettlementInstructions.idempotencyKey, key))
    .limit(1);
  return row ?? null;
}

export async function listInstructions(opts: {
  userId?: string;
  assetId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ instructions: CapSettlementInstruction[]; total: number }> {
  const conditions: SQL[] = [];
  if (opts.userId) conditions.push(eq(capSettlementInstructions.userId, opts.userId));
  if (opts.assetId) conditions.push(eq(capSettlementInstructions.assetId, opts.assetId));
  if (opts.status) conditions.push(eq(capSettlementInstructions.status, opts.status as Status));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  const rows = await db
    .select()
    .from(capSettlementInstructions)
    .where(whereClause)
    .orderBy(desc(capSettlementInstructions.createdAt))
    .limit(limit)
    .offset(offset);

  return { instructions: rows, total: rows.length };
}

// ── Notification context builder ─────────────────────────────────

async function buildCtx(
  instruction: CapSettlementInstruction,
  event: NotificationContext['eventType'],
  correlationId?: string,
  reasonCode?: string,
): Promise<NotificationContext> {
  return {
    eventType: event,
    instructionId: instruction.id,
    userId: instruction.userId,
    assetId: instruction.assetId,
    assetSymbol: '',
    amount: instruction.amount,
    actionType: instruction.actionType,
    correlationId: correlationId ?? null,
    reasonCode: reasonCode ?? null,
  };
}
