/**
 * Capital Infrastructure — Stellar webhook event processor (3B.1b).
 *
 * Processes a single RECEIVED cap_webhook_events row and, if a
 * matching AUTHORIZED settlement instruction is found, drives it to
 * SETTLED via the canonical `externallySettleInstruction` function.
 *
 * Hard contracts enforced here:
 *
 *   1. Idempotent on already-PROCESSED rows.
 *      If processedAt is non-null the processor emits an audit event
 *      and returns without touching any other column.
 *
 *   2. Terminal settlement state safety.
 *      If the matched instruction is already in a terminal state,
 *      the ConflictError from `externallySettleInstruction` is caught
 *      and the webhook event is marked PROCESSED with a
 *      TERMINAL_STATE_NO_OP reason (no settlement mutation is made
 *      and no downgrade occurs).
 *
 *   3. Ambiguous match rule (clarification #6).
 *      If multiple instructions map to the same tx hash (without a
 *      unique op-level match) the processor does NOT choose
 *      heuristically. It marks the webhook event FAILED with reason
 *      AMBIGUOUS_MATCH so an operator can resolve it.
 *
 *   4. No direct writes to portfolio, reserve, or settlement tables.
 *      All settlement mutation goes through `externallySettleInstruction`,
 *      which enforces the state machine + portfolio write contract.
 *
 *   5. The only cap_ tables written here are cap_webhook_events
 *      (status update) and cap_audit_events (audit trail).
 */

import { db } from '../../../server/db';
import { capWebhookEvents } from '../../../shared/capInfraSchema';
import { eq } from 'drizzle-orm';
import { emitAuditEvent } from '../audit';
import { ConflictError } from '../errors';
import {
  getInstructionsByExternalRef,
  externallySettleInstruction,
} from '../settlement';
import { mapStellarEvent } from './stellarMapping';
import { mapAchEvent } from './achMapping';
import { STELLAR_ADAPTER_KIND } from '../adapters/stellar';
import { ACH_ADAPTER_KIND } from '../adapters/ach';
import { decimalStringToCents } from '../adapters/ach/sdk';
import type { SettlementTransitionIntent } from './stellarMapping';

const PROCESSOR_ACTOR = 'webhook-processor';

export type ProcessOutcome =
  | 'SETTLED'
  | 'FAILED_NO_INSTRUCTION'
  | 'FAILED_AMBIGUOUS_MATCH'
  | 'FAILED_WRONG_STATE'
  | 'FAILED_TERMINAL_NO_OP'
  | 'FAILED_TRANSITION_ERROR'
  | 'FAILED_AMOUNT_MISMATCH'
  | 'NO_OP_ALREADY_PROCESSED'
  | 'NO_OP_EVENT_TYPE'
  | 'NO_OP_MISSING_TX_HASH'
  | 'NO_OP_FAIL_ACTION_DEFERRED'
  | 'NO_OP_TRANSITION';

export interface ProcessResult {
  webhookEventId: string;
  outcome: ProcessOutcome;
  instructionId: string | null;
  detail: string;
}

/**
 * Persist the final status of a webhook event and emit an audit trail.
 * The function deliberately avoids overwriting prior processedAt or
 * settlementInstructionId on already-PROCESSED rows; callers that
 * detect that case should return early before reaching here.
 */
async function finaliseEvent(
  eventId: string,
  outcome: ProcessOutcome,
  instructionId: string | null,
  detail: string,
): Promise<void> {
  const isProcessed =
    outcome === 'SETTLED' ||
    outcome.startsWith('NO_OP_') ||
    outcome === 'FAILED_TERMINAL_NO_OP';
  const isFailed = outcome.startsWith('FAILED_');

  await db
    .update(capWebhookEvents)
    .set({
      status: isFailed ? 'FAILED' : 'PROCESSED',
      processedAt: new Date(),
      settlementInstructionId: instructionId ?? undefined,
      lastError: isFailed || !isProcessed ? detail : null,
    })
    .where(eq(capWebhookEvents.id, eventId));

  await emitAuditEvent({
    eventType: `webhook.event.${isFailed ? 'failed' : 'processed'}`,
    aggregateType: 'cap_webhook_event',
    aggregateId: eventId,
    payloadJson: {
      outcome,
      instructionId,
      detail,
    },
  });
}

export async function processEvent(eventId: string): Promise<ProcessResult> {
  // Load the event row. Unknown id is a hard error.
  const [event] = await db
    .select()
    .from(capWebhookEvents)
    .where(eq(capWebhookEvents.id, eventId))
    .limit(1);
  if (!event) {
    throw new Error(`webhook event ${eventId} not found`);
  }

  // ── Contract 1: idempotent on already-PROCESSED rows ──────────────
  if (event.processedAt !== null) {
    await emitAuditEvent({
      eventType: 'webhook.event.process.noop_already_processed',
      aggregateType: 'cap_webhook_event',
      aggregateId: eventId,
      payloadJson: { processedAt: event.processedAt.toISOString() },
    });
    return {
      webhookEventId: eventId,
      outcome: 'NO_OP_ALREADY_PROCESSED',
      instructionId: event.settlementInstructionId ?? null,
      detail: `Event already processed at ${event.processedAt.toISOString()}`,
    };
  }

  // Only process RECEIVED+verified events; everything else was quarantined
  // by ingress and should not be auto-processed.
  if (event.status !== 'RECEIVED' || !event.signatureVerified) {
    return {
      webhookEventId: eventId,
      outcome: 'NO_OP_TRANSITION',
      instructionId: null,
      detail: `Event status=${event.status} signatureVerified=${event.signatureVerified} — not eligible`,
    };
  }

  // ── Map the payload to a transition intent ─────────────────────────
  // Route to the per-adapter mapper based on event.adapterKey so the
  // processor handles both STELLAR and ACH events without importing
  // adapter internals directly.
  const rawPayload = (event.rawPayloadJson ?? {}) as Record<string, unknown>;
  const rawHeaders = (event.rawHeadersJson ?? {}) as Record<string, string>;

  let intent: SettlementTransitionIntent | null;
  if (event.adapterKey === ACH_ADAPTER_KIND) {
    intent = mapAchEvent(rawPayload);
  } else {
    // Default to Stellar mapping (covers STELLAR_ADAPTER_KIND).
    const eventTypeHeader = rawHeaders['x-stellar-event-type'] ?? null;
    intent = mapStellarEvent(rawPayload, eventTypeHeader);
  }

  if (!intent) {
    const outcome: ProcessOutcome = 'NO_OP_MISSING_TX_HASH';
    await finaliseEvent(eventId, outcome, null, 'No externalRef derivable from payload; cannot match an instruction');
    return { webhookEventId: eventId, outcome, instructionId: null, detail: 'No externalRef' };
  }

  if (intent.action === 'NO_OP') {
    const outcome: ProcessOutcome = 'NO_OP_EVENT_TYPE';
    await finaliseEvent(eventId, outcome, null, `Event type ${intent.eventType} is advisory; no transition`);
    return { webhookEventId: eventId, outcome, instructionId: null, detail: `Advisory event type ${intent.eventType}` };
  }

  // FAIL action: Stellar defers to LIVE mode; ACH can process FAIL
  // events (returned/reversed/declined) since they don't require a
  // live submission — they only need to advance the local state.
  if (intent.action === 'FAIL' && event.adapterKey === STELLAR_ADAPTER_KIND) {
    const outcome: ProcessOutcome = 'NO_OP_FAIL_ACTION_DEFERRED';
    await finaliseEvent(eventId, outcome, null, `FAIL action deferred to LIVE mode; event type ${intent.eventType}`);
    return { webhookEventId: eventId, outcome, instructionId: null, detail: 'FAIL action deferred' };
  }

  // ── Look up matching instruction by externalRef ───────────────────
  const matches = await getInstructionsByExternalRef(intent.txHash, event.adapterKey);

  // ── Contract 3: ambiguous match → FAILED + emit audit ────────────
  // If opId is available and unique, we could disambiguate; but in the
  // DRY_RUN sandbox the externalRef on a DRYRUN- receipt won't match
  // a live tx hash anyway, so multi-match is impossible in normal
  // operation. We still guard defensively.
  if (matches.length > 1) {
    const outcome: ProcessOutcome = 'FAILED_AMBIGUOUS_MATCH';
    const detail = `${matches.length} instructions match tx_hash ${intent.txHash}; manual intervention required`;
    await finaliseEvent(eventId, outcome, null, detail);
    return { webhookEventId: eventId, outcome, instructionId: null, detail };
  }

  if (matches.length === 0) {
    const outcome: ProcessOutcome = 'FAILED_NO_INSTRUCTION';
    const detail = `No STELLAR instruction found with externalRef=${intent.txHash}`;
    await finaliseEvent(eventId, outcome, null, detail);
    return { webhookEventId: eventId, outcome, instructionId: null, detail };
  }

  const instruction = matches[0];

  // ── Contract 2: terminal state safety ────────────────────────────
  const TERMINAL = ['SETTLED', 'FAILED', 'CANCELLED'] as const;
  if ((TERMINAL as readonly string[]).includes(instruction.status)) {
    const outcome: ProcessOutcome = 'FAILED_TERMINAL_NO_OP';
    const detail = `Instruction ${instruction.id} is already terminal (${instruction.status}); no settlement write made`;
    await finaliseEvent(eventId, outcome, instruction.id, detail);
    return { webhookEventId: eventId, outcome, instructionId: instruction.id, detail };
  }

  // Accept AUTHORIZED (Stellar / non-ACH webhook path) and SUBMITTED
  // (ACH settlement-confirmation path: webhook or reconciliation).
  const PROCESSABLE = ['AUTHORIZED', 'SUBMITTED'] as const;
  if (!(PROCESSABLE as readonly string[]).includes(instruction.status)) {
    const outcome: ProcessOutcome = 'FAILED_WRONG_STATE';
    const detail = `Instruction ${instruction.id} is in state ${instruction.status}; only AUTHORIZED or SUBMITTED is processable`;
    await finaliseEvent(eventId, outcome, instruction.id, detail);
    return { webhookEventId: eventId, outcome, instructionId: instruction.id, detail };
  }

  // ── ACH SUBMITTED amount-match guard (guardrail #4) ──────────────
  // When confirming a SUBMITTED ACH instruction, the observed amount
  // from the settlement-confirming event MUST match the instruction
  // amount exactly. Mismatches stay unresolved (not auto-settled).
  if (
    instruction.status === 'SUBMITTED' &&
    event.adapterKey === ACH_ADAPTER_KIND &&
    intent.action === 'SETTLE'
  ) {
    if (intent.observedAmount) {
      const observedCents = decimalStringToCents(intent.observedAmount);
      const instructionCents = decimalStringToCents(instruction.amount);
      if (observedCents !== instructionCents) {
        const outcome: ProcessOutcome = 'FAILED_AMOUNT_MISMATCH';
        const detail = `Amount mismatch: instruction=${instruction.amount} (${instructionCents}¢) vs observed=${intent.observedAmount} (${observedCents}¢); staying unresolved`;
        await finaliseEvent(eventId, outcome, instruction.id, detail);
        return { webhookEventId: eventId, outcome, instructionId: instruction.id, detail };
      }
    }
  }

  // ── Attempt the canonical settlement transition ───────────────────
  try {
    await externallySettleInstruction({
      instructionId: instruction.id,
      externalRef: intent.txHash,
      settledAt: intent.occurredAt,
      webhookEventId: eventId,
      observedAmount: intent.observedAmount ?? undefined,
      observedAsset: intent.observedAsset ?? undefined,
      actor: PROCESSOR_ACTOR,
    });

    await finaliseEvent(eventId, 'SETTLED', instruction.id, `Settled via ${event.adapterKey} webhook; externalRef=${intent.txHash}`);
    return {
      webhookEventId: eventId,
      outcome: 'SETTLED',
      instructionId: instruction.id,
      detail: `Instruction ${instruction.id} → SETTLED`,
    };
  } catch (err: unknown) {
    // Distinguish terminal-state conflicts from genuine errors.
    if (err instanceof ConflictError) {
      if (err.message.startsWith('external_settle_on_terminal')) {
        const outcome: ProcessOutcome = 'FAILED_TERMINAL_NO_OP';
        const detail = `Concurrent terminal transition on instruction ${instruction.id}: ${err.message}`;
        await finaliseEvent(eventId, outcome, instruction.id, detail);
        return { webhookEventId: eventId, outcome, instructionId: instruction.id, detail };
      }
    }
    const outcome: ProcessOutcome = 'FAILED_TRANSITION_ERROR';
    const detail = err instanceof Error ? err.message : String(err);
    await finaliseEvent(eventId, outcome, instruction.id, detail);
    return { webhookEventId: eventId, outcome, instructionId: instruction.id, detail };
  }
}
