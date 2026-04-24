/**
 * Card-deposits drain-completion archive emitter (task #250). Fires
 * once when the in-flight count (PENDING + PAYOUT_INITIATED) hits zero.
 *
 * Once-only delivery uses cap_audit_events as a reservation lock:
 * INSERT the deterministic PK ae_cd_drain_archive_v1 with ON CONFLICT
 * DO NOTHING; the winner sends the email and UPDATEs the row to
 * *_emitted; on send failure the winner DELETEs the row so a later
 * call can retry, and writes a separate *_failed audit row.
 *
 * Never throws; webhook callers can fire-and-forget.
 */

import { db } from '../../../server/db';
import {
  capAuditEvents,
  type NewCapAuditEvent,
} from '../../../shared/capInfraSchema';
import { eq } from 'drizzle-orm';
import { generateId } from '../ids';
import { getResendClient } from '../../email/resend';
import {
  buildCardDepositArchiveCsv,
  getInFlightCardDepositCount,
} from './csvExport';

// Deterministic primary-key used to enforce once-only delivery via the
// PK uniqueness constraint on cap_audit_events.id.
export const DRAIN_ARCHIVE_AUDIT_ID = 'ae_cd_drain_archive_v1';
export const DRAIN_ARCHIVE_RESERVED_EVENT_TYPE =
  'card_deposit.drain_archive_reserved';
export const DRAIN_ARCHIVE_EVENT_TYPE = 'card_deposit.drain_archive_emitted';
export const DRAIN_ARCHIVE_FAILED_EVENT_TYPE =
  'card_deposit.drain_archive_failed';
export const DRAIN_ARCHIVE_AGGREGATE_TYPE = 'card_deposit';
export const DRAIN_ARCHIVE_AGGREGATE_ID = '__drain__';

export type DrainArchiveSkipReason =
  | 'in_flight_remaining'
  | 'already_emitted'
  | 'no_recipients_configured'
  | 'no_rows_to_archive';

export interface DrainArchiveResult {
  /** True when no email was sent (and no audit marker written). */
  skipped: boolean;
  /** Machine-readable skip reason, populated when `skipped === true`. */
  reason: DrainArchiveSkipReason | null;
  /** Number of in-flight (PENDING + PAYOUT_INITIATED) rows at check time. */
  inFlightCount: number;
  /** Number of rows in the archive CSV (only when sent). */
  rowCount: number;
  /** Recipient count from CARD_DEPOSITS_ARCHIVE_EMAIL (informational). */
  recipientCount: number;
  /** Captured error message if the send leg failed. */
  error: string | null;
}

/** Structured payload written to the marker / failure audit rows. */
interface DrainArchiveMarkerPayload {
  rowCount: number;
  oldestCreatedAt: string | null;
  newestCreatedAt: string | null;
  recipientCount: number;
  filename: string;
  subject: string;
  emittedAt: string;
}

interface DrainArchiveFailurePayload {
  error: string;
  failedAt: string;
}

interface DrainArchiveReservePayload {
  reservedAt: string;
}

function readRecipients(): string[] {
  const raw = process.env.CARD_DEPOSITS_ARCHIVE_EMAIL ?? '';
  return raw
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

function fmtDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : 'n/a';
}

function buildEmailHtml(args: {
  rowCount: number;
  oldestCreatedAt: Date | null;
  newestCreatedAt: Date | null;
}): string {
  const { rowCount, oldestCreatedAt, newestCreatedAt } = args;
  const dateRange =
    oldestCreatedAt && newestCreatedAt
      ? `${fmtDate(oldestCreatedAt)} → ${fmtDate(newestCreatedAt)}`
      : 'n/a';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #d1d5db;">
        <tr>
          <td style="background:#1e3a5f;padding:28px 32px;">
            <p style="color:#94a3b8;font-family:'Courier New',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px 0;">AXIOM PROTOCOL — CAPITAL INFRASTRUCTURE</p>
            <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:22px;font-weight:700;margin:0;line-height:1.3;">Card-Deposit Rail Drained — Archive Attached</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="color:#111827;font-size:15px;line-height:1.6;margin:0 0 18px 0;">
              The deprecated Stripe card-deposit rail has finished draining: every row
              in <code>cap_card_deposits</code> has reached a terminal status
              (no PENDING or PAYOUT_INITIATED rows remain). The full table has been
              exported as a CSV and is attached to this email for archival.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;margin:0 0 20px 0;">
              <tr><td style="padding:16px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">Row Count</td>
                    <td style="font-size:12px;color:#111827;font-weight:700;text-align:right;padding:4px 0;">${rowCount}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">Date Range (created_at)</td>
                    <td style="font-size:12px;color:#111827;font-weight:600;text-align:right;padding:4px 0;font-family:'Courier New',monospace;">${dateRange}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">In-Flight At Send</td>
                    <td style="font-size:12px;color:#111827;text-align:right;padding:4px 0;">0</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 12px 0;">
              The CSV format matches the operator console download exactly
              (same header order, same escaping). Treat this as the canonical
              archive prior to any future schema drop.
            </p>
            <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;">
              This email is sent at most once per drain (idempotent on
              <code>cap_audit_events.id = '${DRAIN_ARCHIVE_AUDIT_ID}'</code>).
              To re-issue intentionally, delete that audit row.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 32px;">
            <p style="font-size:11px;color:#9ca3af;letter-spacing:.08em;margin:0;">AXIOM PROTOCOL — axiomprotocol.app</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Cheap pre-check; the atomic gate is the reservation INSERT below. */
export async function hasDrainArchiveBeenEmitted(): Promise<boolean> {
  const rows = await db
    .select({ id: capAuditEvents.id })
    .from(capAuditEvents)
    .where(eq(capAuditEvents.id, DRAIN_ARCHIVE_AUDIT_ID))
    .limit(1);
  return rows.length > 0;
}

export interface MaybeEmitDrainArchiveOptions {
  /** Override the env-var recipient list (used by tests). */
  recipientsOverride?: string[];
}

/** Best-effort drain-completion archive emitter. Never throws. */
export async function maybeEmitDrainArchiveEmail(
  options: MaybeEmitDrainArchiveOptions = {},
): Promise<DrainArchiveResult> {
  const baseResult: DrainArchiveResult = {
    skipped: true,
    reason: null,
    inFlightCount: -1,
    rowCount: 0,
    recipientCount: 0,
    error: null,
  };

  let inFlightCount: number;
  try {
    inFlightCount = await getInFlightCardDepositCount();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[card-deposits/drain-archive] failed to read in-flight count:', msg);
    return { ...baseResult, error: `in_flight_count: ${msg}` };
  }
  baseResult.inFlightCount = inFlightCount;

  if (inFlightCount > 0) {
    return { ...baseResult, reason: 'in_flight_remaining' };
  }

  // Cheap pre-check; the reservation INSERT below is the atomic gate.
  let alreadyEmitted = false;
  try {
    alreadyEmitted = await hasDrainArchiveBeenEmitted();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[card-deposits/drain-archive] failed to check audit marker:', msg);
    return { ...baseResult, error: `audit_check: ${msg}` };
  }
  if (alreadyEmitted) {
    return { ...baseResult, reason: 'already_emitted' };
  }

  const recipients = options.recipientsOverride ?? readRecipients();
  baseResult.recipientCount = recipients.length;
  if (recipients.length === 0) {
    console.warn(
      '[card-deposits/drain-archive] in-flight count is 0 but ' +
        'CARD_DEPOSITS_ARCHIVE_EMAIL is not configured — skipping (will retry on next webhook).',
    );
    return { ...baseResult, reason: 'no_recipients_configured' };
  }

  let archive: Awaited<ReturnType<typeof buildCardDepositArchiveCsv>>;
  try {
    archive = await buildCardDepositArchiveCsv();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[card-deposits/drain-archive] CSV build failed:', msg);
    await tryWriteFailureAudit(`csv_build: ${msg}`);
    return { ...baseResult, error: `csv_build: ${msg}` };
  }

  if (archive.rowCount === 0) {
    // No marker written, so a real future drain can still fire.
    console.log('[card-deposits/drain-archive] no rows in cap_card_deposits; skipping email.');
    return { ...baseResult, reason: 'no_rows_to_archive' };
  }

  // Reserve the slot via INSERT ... ON CONFLICT DO NOTHING. The loser
  // of a concurrent race sees an empty returning() and short-circuits.
  const reservePayload: DrainArchiveReservePayload = {
    reservedAt: new Date().toISOString(),
  };
  const reserveRow: NewCapAuditEvent = {
    id: DRAIN_ARCHIVE_AUDIT_ID,
    eventType: DRAIN_ARCHIVE_RESERVED_EVENT_TYPE,
    aggregateType: DRAIN_ARCHIVE_AGGREGATE_TYPE,
    aggregateId: DRAIN_ARCHIVE_AGGREGATE_ID,
    payloadJson: reservePayload,
    actor: 'system@card-deposit-drain',
  };
  let reserved: { id: string }[];
  try {
    reserved = await db
      .insert(capAuditEvents)
      .values(reserveRow)
      .onConflictDoNothing({ target: capAuditEvents.id })
      .returning({ id: capAuditEvents.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[card-deposits/drain-archive] reservation insert failed:', msg);
    await tryWriteFailureAudit(`reserve: ${msg}`);
    return { ...baseResult, rowCount: archive.rowCount, error: `reserve: ${msg}` };
  }
  if (reserved.length === 0) {
    return {
      ...baseResult,
      rowCount: archive.rowCount,
      reason: 'already_emitted',
    };
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const filename = `cap_card_deposits_${stamp}.csv`;
  const subject = `[AXIOM] Card-deposit rail drained — ${archive.rowCount} rows ${fmtDate(archive.oldestCreatedAt)}→${fmtDate(archive.newestCreatedAt)}`;
  const html = buildEmailHtml({
    rowCount: archive.rowCount,
    oldestCreatedAt: archive.oldestCreatedAt,
    newestCreatedAt: archive.newestCreatedAt,
  });

  try {
    const { client, fromEmail } = await getResendClient();
    await client.emails.send({
      from: fromEmail,
      to: recipients,
      subject,
      html,
      attachments: [
        {
          filename,
          content: Buffer.from(archive.csv, 'utf-8'),
        },
      ],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[card-deposits/drain-archive] email send failed:', msg);
    // Release the reservation so a later call can retry.
    try {
      await db
        .delete(capAuditEvents)
        .where(eq(capAuditEvents.id, DRAIN_ARCHIVE_AUDIT_ID));
    } catch (delErr: unknown) {
      const delMsg = delErr instanceof Error ? delErr.message : 'unknown';
      console.error('[card-deposits/drain-archive] reservation rollback failed:', delMsg);
    }
    await tryWriteFailureAudit(`email_send: ${msg}`);
    return {
      ...baseResult,
      rowCount: archive.rowCount,
      error: `email_send: ${msg}`,
    };
  }

  // Promote the reservation row to *_emitted with the final payload.
  const finalPayload: DrainArchiveMarkerPayload = {
    rowCount: archive.rowCount,
    oldestCreatedAt: archive.oldestCreatedAt?.toISOString() ?? null,
    newestCreatedAt: archive.newestCreatedAt?.toISOString() ?? null,
    recipientCount: recipients.length,
    filename,
    subject,
    emittedAt: new Date().toISOString(),
  };
  try {
    await db
      .update(capAuditEvents)
      .set({
        eventType: DRAIN_ARCHIVE_EVENT_TYPE,
        payloadJson: finalPayload,
      })
      .where(eq(capAuditEvents.id, DRAIN_ARCHIVE_AUDIT_ID));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[card-deposits/drain-archive] marker promotion failed after send:', msg);
    // Email went out and the reservation row remains — future calls skip correctly.
  }

  return {
    skipped: false,
    reason: null,
    inFlightCount: 0,
    rowCount: archive.rowCount,
    recipientCount: recipients.length,
    error: null,
  };
}

async function tryWriteFailureAudit(message: string): Promise<void> {
  try {
    const payload: DrainArchiveFailurePayload = {
      error: message,
      failedAt: new Date().toISOString(),
    };
    const row: NewCapAuditEvent = {
      id: generateId('ae'),
      eventType: DRAIN_ARCHIVE_FAILED_EVENT_TYPE,
      aggregateType: DRAIN_ARCHIVE_AGGREGATE_TYPE,
      aggregateId: DRAIN_ARCHIVE_AGGREGATE_ID,
      payloadJson: payload,
      actor: 'system@card-deposit-drain',
    };
    await db.insert(capAuditEvents).values(row);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[card-deposits/drain-archive] failure-audit insert failed:', msg);
  }
}
