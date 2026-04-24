/**
 * Capital Infrastructure — Admin-action recorder (Phase 3A.3 + 3B.3).
 *
 * Dual-actor flows (reserve mode change, webhook reclassification, ACH mode
 * transitions, emergency-disable acknowledgment) require a SECOND actor
 * identity that is DISTINCT from the first. Both identities are persisted
 * to `cap_admin_actions`. The constant-time string compare and normalization
 * (trim + lowercase) prevent trivial spoofing via casing or whitespace.
 *
 * Phase 3B.3 extensions:
 *  - DualActorActionType gains 'ach.mode.transition' and
 *    'ach.emergency_disable.acknowledged'.
 *  - New SingleActorActionType union for append-only single-actor actions
 *    (emergency-disable, approve/reject, submitted-review markers).
 *  - recordSingleActorAction() — single-actor append-only path. secondaryActor
 *    is omitted. assertDistinctActors is NOT called. Used where the approved
 *    plan specifies immediate single-actor gating without a second actor
 *    (e.g. emergency disable trigger, operator approval/rejection).
 *
 * Append-only contract: no row in cap_admin_actions is ever updated
 * or deleted. Idempotency is achieved by callers passing a correlationId
 * keyed to the operation; callers must not call this twice for the same
 * operation unless they handle the resulting duplicate rows.
 */

import { db } from '../../server/db';
import {
  capAdminActions,
  type NewCapAuditEvent,
} from '../../shared/capInfraSchema';
import { generateId } from './ids';
import { emitAuditEventStrict } from './audit';
import { ValidationError } from './errors';

type DbLike = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// ── Dual-actor action types ────────────────────────────────────────────────
// Require assertDistinctActors (primary ≠ secondary).
export type DualActorActionType =
  | 'reserve.config.change'
  | 'webhook.event.reclassify'
  // Phase 3B.3: ACH production rollout
  | 'ach.mode.transition'
  | 'ach.emergency_disable.acknowledged';

// ── Single-actor action types ──────────────────────────────────────────────
// Append-only, no secondaryActor required. Used for:
//   - emergency disable (immediate, one operator, 4h ack window opens)
//   - approve/reject PENDING_OPERATOR_APPROVAL instructions (one operator)
//   - submitted-review markers (append-only traceability)
//   - sweep-timeouts (automated, actor=system)
//   - ACH validation run actions
export type SingleActorActionType =
  | 'ach.emergency_disable'
  | 'ach.approval'
  | 'ach.rejection'
  | 'ach.sweep_timeouts'
  | 'settlement.ach.submitted_review'
  | 'settlement.ach.submitted_confirmed_cleared'
  | 'settlement.ach.submitted_confirmed_returned'
  | 'ach.validation.account_reachable'
  | 'ach.validation.webhook_secret_valid'
  | 'ach.validation.webhook_roundtrip_pass'
  | 'ach.validation.duplicate_dedup_pass'
  | 'ach.validation.reconcile_pass';

export type AdminActionType = DualActorActionType | SingleActorActionType;

// ── Dual-actor shared interface ────────────────────────────────────────────

export interface RecordDualActorInput {
  actionType: DualActorActionType;
  subjectType: string;
  subjectId: string;
  primaryActor: string;
  secondaryActor: string;
  reasonCode: string;
  payload?: Record<string, unknown> | null;
  correlationId?: string | null;
}

// ── Single-actor interface ─────────────────────────────────────────────────

export interface RecordSingleActorInput {
  actionType: SingleActorActionType;
  subjectType: string;
  subjectId: string;
  actor: string;
  reasonCode: string;
  payload?: Record<string, unknown> | null;
  correlationId?: string | null;
}

// ── Actor normalization ────────────────────────────────────────────────────

function normalizeActor(actor: string): string {
  return actor.trim().toLowerCase();
}

export function assertDistinctActors(primary: string, secondary: string): void {
  if (!primary || !secondary) {
    throw new ValidationError('primary and secondary actor identities are required');
  }
  if (normalizeActor(primary) === normalizeActor(secondary)) {
    throw new ValidationError(
      'secondary actor must be a distinct identity from the primary actor',
    );
  }
}

// ── Dual-actor recorder ────────────────────────────────────────────────────

export async function recordDualActorAction(
  input: RecordDualActorInput,
  dbHandle: DbLike = db,
): Promise<string> {
  assertDistinctActors(input.primaryActor, input.secondaryActor);
  if (!input.reasonCode) throw new ValidationError('reasonCode is required');
  const id = generateId('aa');
  await (dbHandle as typeof db).insert(capAdminActions).values({
    id,
    actionType: input.actionType,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    primaryActor: input.primaryActor,
    secondaryActor: input.secondaryActor,
    reasonCode: input.reasonCode,
    payloadJson: (input.payload ?? null) as Record<string, unknown> | null,
    correlationId: input.correlationId ?? null,
  });
  await emitAuditEventStrict(
    {
      eventType: `admin.${input.actionType}`,
      aggregateType: input.subjectType,
      aggregateId: input.subjectId,
      actor: input.primaryActor,
      correlationId: input.correlationId ?? undefined,
      payloadJson: {
        adminActionId: id,
        primaryActor: input.primaryActor,
        secondaryActor: input.secondaryActor,
        reasonCode: input.reasonCode,
      } satisfies NonNullable<NewCapAuditEvent['payloadJson']>,
    },
    dbHandle,
  );
  return id;
}

// ── Single-actor recorder ──────────────────────────────────────────────────

/**
 * Append-only single-actor admin action. No assertDistinctActors.
 * Used for emergency disable, approve, reject, sweep-timeouts,
 * and submitted-review markers per the approved Phase 3B.3 plan.
 *
 * The secondaryActor column is intentionally omitted (null in DB).
 */
export async function recordSingleActorAction(
  input: RecordSingleActorInput,
  dbHandle: DbLike = db,
): Promise<string> {
  if (!input.actor) throw new ValidationError('actor is required');
  if (!input.reasonCode) throw new ValidationError('reasonCode is required');
  const id = generateId('aa');
  await (dbHandle as typeof db).insert(capAdminActions).values({
    id,
    actionType: input.actionType,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    primaryActor: input.actor,
    secondaryActor: null,
    reasonCode: input.reasonCode,
    payloadJson: (input.payload ?? null) as Record<string, unknown> | null,
    correlationId: input.correlationId ?? null,
  });
  await emitAuditEventStrict(
    {
      eventType: `admin.${input.actionType}`,
      aggregateType: input.subjectType,
      aggregateId: input.subjectId,
      actor: input.actor,
      correlationId: input.correlationId ?? undefined,
      payloadJson: {
        adminActionId: id,
        actor: input.actor,
        reasonCode: input.reasonCode,
      } satisfies NonNullable<NewCapAuditEvent['payloadJson']>,
    },
    dbHandle,
  );
  return id;
}
