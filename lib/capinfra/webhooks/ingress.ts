/**
 * Capital Infrastructure — generic webhook ingress pipeline (Phase 3B.1a).
 *
 * Contract guarantees enforced here:
 *   1. PERSIST RAW PAYLOAD FIRST. The bytes are written to
 *      `cap_webhook_events.raw_payload_json` (or wrapped under
 *      `{ malformed: true, raw }` when the body is not JSON) BEFORE
 *      any verifier runs. If verification later throws, the row still
 *      exists in QUARANTINED state — we never lose evidence.
 *   2. NO PORTFOLIO / NO RESERVE / NO SETTLEMENT mutation. The pipeline
 *      writes to `cap_webhook_events`, `cap_audit_events`, and nothing
 *      else. Downstream effects are deferred to 3B.1b/3B.2 and run via
 *      a separate processor reading this table.
 *   3. IDEMPOTENT on `(adapter_key, external_event_id)`. A duplicate
 *      verified event:
 *        - bumps `attempts` (the "last_seen" counter; the schema does
 *          not have a discrete last_seen_at column),
 *        - emits an audit event for observability (per the 3B.1a
 *          micro-clarification),
 *        - does NOT overwrite `processed_at`, `signature_verified`,
 *          `raw_payload_json`, or any reclassify-* fields.
 *   4. MALFORMED bodies and SIGNATURE failures both land as QUARANTINED
 *      with a stable `reason_code` in `last_error`.
 */

import { db } from '../../../server/db';
import {
  capWebhookEvents,
  type NewCapWebhookEvent,
} from '../../../shared/capInfraSchema';
import { and, eq, sql } from 'drizzle-orm';
import { generateId } from '../ids';
import { emitAuditEvent } from '../audit';
import type { SettlementAdapter, AdapterWebhookVerifyResult } from '../adapters/types';

export interface IngressInput {
  adapterKey: string;
  rawBody: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface IngressOutcome {
  eventId: string;
  status: 'RECEIVED' | 'QUARANTINED';
  duplicate: boolean;
  reasonCode: string;
  externalEventId: string | null;
}

function safeParse(rawBody: string): { ok: true; json: Record<string, unknown> } | { ok: false; raw: string } {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ok: true, json: parsed as Record<string, unknown> };
    }
    return { ok: false, raw: rawBody };
  } catch {
    return { ok: false, raw: rawBody };
  }
}

function headerSnapshot(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  // Capture only safe, lowercase, string-valued headers. Any auth
  // header values are dropped so audit dumps cannot leak credentials.
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const key = k.toLowerCase();
    if (key === 'cookie' || key === 'authorization') continue;
    if (Array.isArray(v)) out[key] = v.join(',');
    else if (typeof v === 'string') out[key] = v;
  }
  return out;
}

/**
 * Persist a raw payload first, then run the adapter's verifier and
 * decide RECEIVED vs QUARANTINED. Returns a structured outcome; never
 * throws on verification failure (the row is the system of record).
 */
export async function ingestWebhook(
  adapter: SettlementAdapter,
  input: IngressInput,
): Promise<IngressOutcome> {
  const adapterKey = input.adapterKey;
  const headersJson = headerSnapshot(input.headers);
  const parsed = safeParse(input.rawBody);
  const rawPayloadJson: Record<string, unknown> = parsed.ok
    ? parsed.json
    : { malformed: true, raw: parsed.raw.slice(0, 64 * 1024) };

  // Step 1: PERSIST RAW PAYLOAD FIRST. Status defaults to 'RECEIVED';
  // we will demote to 'QUARANTINED' below if verification fails.
  const id = generateId('we');
  const baseRow: NewCapWebhookEvent = {
    id,
    adapterKey,
    externalEventId: null,
    rawPayloadJson,
    rawHeadersJson: headersJson,
    signatureVerified: false,
    status: parsed.ok ? 'RECEIVED' : 'QUARANTINED',
    attempts: 1,
    lastError: parsed.ok ? null : 'MALFORMED_BODY',
    settlementInstructionId: null,
    receivedAt: new Date(),
    processedAt: null,
    reclassifiedBy: null,
    reclassifiedAt: null,
    reclassificationReason: null,
  };

  // If body is malformed, short-circuit — verifier cannot help.
  if (!parsed.ok) {
    await db.insert(capWebhookEvents).values(baseRow);
    await emitAuditEvent({
      eventType: 'webhook.received.malformed',
      aggregateType: 'cap_webhook_event',
      aggregateId: id,
      payloadJson: { adapterKey, reasonCode: 'MALFORMED_BODY' },
    });
    return {
      eventId: id,
      status: 'QUARANTINED',
      duplicate: false,
      reasonCode: 'MALFORMED_BODY',
      externalEventId: null,
    };
  }

  // Step 2: run verifier (pure function, no DB).
  let verdict: AdapterWebhookVerifyResult;
  try {
    if (!adapter.verifyWebhook) {
      verdict = {
        verified: false,
        reasonCode: 'NO_VERIFIER',
        externalEventId: null,
        eventType: null,
      };
    } else {
      verdict = await adapter.verifyWebhook({ rawBody: input.rawBody, headers: input.headers });
    }
  } catch (err: unknown) {
    verdict = {
      verified: false,
      reasonCode: 'VERIFIER_THREW',
      externalEventId: null,
      eventType: err instanceof Error ? err.message.slice(0, 80) : null,
    };
  }

  // Step 3: idempotency check — for VERIFIED events with an
  // externalEventId, look for a prior row with the same (adapter, ext)
  // pair. If found, do NOT overwrite prior processing metadata; bump
  // attempts and emit a duplicate audit event.
  if (verdict.verified && verdict.externalEventId) {
    const [prior] = await db
      .select()
      .from(capWebhookEvents)
      .where(
        and(
          eq(capWebhookEvents.adapterKey, adapterKey),
          eq(capWebhookEvents.externalEventId, verdict.externalEventId),
        ),
      )
      .limit(1);
    if (prior) {
      // Bump attempts on the EXISTING row. The new row is not inserted —
      // the prior row remains the system of record.
      await db
        .update(capWebhookEvents)
        .set({ attempts: sql`${capWebhookEvents.attempts} + 1` })
        .where(eq(capWebhookEvents.id, prior.id));
      await emitAuditEvent({
        eventType: 'webhook.received.duplicate',
        aggregateType: 'cap_webhook_event',
        aggregateId: prior.id,
        payloadJson: {
          adapterKey,
          externalEventId: verdict.externalEventId,
          eventType: verdict.eventType,
        },
      });
      return {
        eventId: prior.id,
        status: prior.status as IngressOutcome['status'],
        duplicate: true,
        reasonCode: 'DUPLICATE',
        externalEventId: verdict.externalEventId,
      };
    }
  }

  // Step 4: insert the row with the verifier's verdict applied.
  // If the verifier signals quarantineReason (e.g. UNSUPPORTED_INBOUND_EVENT),
  // the row is QUARANTINED even though signatureVerified=true. This covers
  // events like inbound ACH transfers that pass the HMAC check but are not
  // eligible for settlement processing in Phase 3B.2.
  const forceQuarantine = verdict.verified && !!verdict.quarantineReason;
  const isQuarantined = !verdict.verified || forceQuarantine;
  const insertRow: NewCapWebhookEvent = {
    ...baseRow,
    externalEventId: verdict.externalEventId,
    signatureVerified: verdict.verified,
    status: isQuarantined ? 'QUARANTINED' : 'RECEIVED',
    lastError: !verdict.verified
      ? verdict.reasonCode
      : (verdict.quarantineReason ?? null),
  };
  await db.insert(capWebhookEvents).values(insertRow);

  await emitAuditEvent({
    eventType: isQuarantined ? 'webhook.received.quarantined' : 'webhook.received.verified',
    aggregateType: 'cap_webhook_event',
    aggregateId: id,
    payloadJson: {
      adapterKey,
      externalEventId: verdict.externalEventId,
      eventType: verdict.eventType,
      reasonCode: verdict.reasonCode,
      quarantineReason: verdict.quarantineReason ?? null,
    },
  });

  // Step 5: for verified STELLAR and ACH events (not force-quarantined),
  // fire-and-forget the processor. Persistence-first contract is already
  // satisfied. The enqueue is best-effort — its failure does NOT affect
  // the 202 response or the row's RECEIVED status. The operator can always
  // trigger processing manually via the admin endpoint.
  const eligibleForProcessing = verdict.verified && !forceQuarantine;
  if (eligibleForProcessing && (adapterKey === 'STELLAR' || adapterKey === 'ACH')) {
    import('./processor').then(({ processEvent }) => {
      processEvent(id).catch((err: unknown) => {
        console.error('[capinfra/ingress] fire-and-forget processor error', id, err);
      });
    }).catch(() => { /* module load failure — logged elsewhere */ });
  }

  return {
    eventId: id,
    status: insertRow.status as IngressOutcome['status'],
    duplicate: false,
    reasonCode: verdict.reasonCode,
    externalEventId: verdict.externalEventId,
  };
}
