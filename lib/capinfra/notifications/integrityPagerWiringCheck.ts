/**
 * Capital Infrastructure — Scheduled integrity pager wiring check.
 *
 * The runbook in `documents/cap-infra/README.md` requires on-call to
 * manually run a wiring check via `POST /api/capinfra/risk/integrity/test-page`
 * after every rotation. In practice expired Discord webhooks and lapsed
 * Resend domain verifications can silently break the pager between
 * rotations — and a real `collateral.integrity_failed` event is the
 * worst possible time to discover that.
 *
 * This module is the body of the scheduled job that fires the same
 * synthetic test page on a fixed cadence, compares the result against
 * what the env vars say is configured, persists every run for the
 * operator dashboard, and notifies the runbook owner via a
 * separately-configured channel when something is wrong.
 *
 * Independence from the broken pager
 * ----------------------------------
 * The owner notification path uses `INTEGRITY_PAGER_WIRING_OWNER_EMAIL`
 * (a dedicated env var) sent through Resend. Crucially it does NOT
 * depend on `INTEGRITY_ALERT_EMAIL` or `INTEGRITY_ALERT_DISCORD_WEBHOOK`,
 * so the alert about the broken pager is never delivered through the
 * very channel that just failed. Operators are explicitly instructed
 * to point the owner alias at a different inbox (e.g. an SRE lead's
 * personal address, not the on-call rotation alias) for the same
 * reason.
 *
 * Best-effort guarantees
 * ----------------------
 * - Never throws. Pager errors, owner-notify errors and DB persistence
 *   errors are all caught and surfaced inside the result envelope so a
 *   broken DB or transient Resend outage cannot stop the scheduler from
 *   reporting back to its caller.
 * - The persisted run is opportunistic: if the INSERT fails the result
 *   is still returned to the scheduler so the cron caller logs the
 *   outcome even when the audit table is unavailable.
 */

import { pool } from '../../../server/db';
import { getResendClient } from '../../email/resend';
import { pageOnCallForIntegrityFailure } from './integrityPager';
import {
  readIntegrityAlertDiscordWebhook,
  readIntegrityAlertEmailRecipients,
} from './integrityPagerStatus';

export const SYNTHETIC_WIRING_CHECK_ASSET_ID = 'WIRING-CHECK-SYNTHETIC';
export const SYNTHETIC_WIRING_CHECK_SYMBOL = 'WIRING-CHECK';
export const SYNTHETIC_WIRING_CHECK_KIND = 'wiring_check';
export const DEFAULT_WIRING_CHECK_ACTOR =
  'scheduler:integrity-pager-wiring-check';

/** Recognised paging channel names. Mirrors `integrityPager.ts`. */
export type WiringCheckChannel = 'email' | 'discord';

export interface WiringCheckResult {
  /** ISO timestamp of when the run began. */
  ranAt: string;
  /**
   * `true` when the pager reached every expected channel and produced
   * no per-channel errors. `false` when any expected channel was
   * missing, any channel errored, or no channels are configured at
   * all (in which case `skippedReason === 'no_channels_configured'`).
   */
  ok: boolean;
  /**
   * Channels the env vars claim are configured. A subset of
   * {email, discord}.
   */
  expectedChannels: WiringCheckChannel[];
  /** Channels the synthetic page actually reached. */
  channelsPaged: string[];
  /** Per-channel errors from the pager fan-out (`'<channel>: <message>'`). */
  pagerErrors: string[];
  /**
   * Channels that were expected but never appeared in `channelsPaged`.
   * Empty on a healthy run.
   */
  missingChannels: WiringCheckChannel[];
  /**
   * `true` when the runbook-owner alert email was actually sent.
   * Stays `false` on healthy runs (no alert needed) and on unhealthy
   * runs where the owner email isn't configured.
   */
  ownerNotified: boolean;
  /**
   * Owner-notification error string, e.g. "Resend not connected".
   * `null` when the owner email succeeded or no notification was
   * attempted.
   */
  ownerNotifyError: string | null;
  /** `true` when `INTEGRITY_PAGER_WIRING_OWNER_EMAIL` resolves to ≥1 recipient. */
  ownerEmailConfigured: boolean;
  /**
   * Free-form reason the run was effectively skipped. Currently only
   * `'no_channels_configured'`, set when neither
   * `INTEGRITY_ALERT_EMAIL` nor `INTEGRITY_ALERT_DISCORD_WEBHOOK` is
   * set. The synthetic page itself is still attempted (and returns
   * `skipped: true` from the pager) so the operator console can
   * distinguish "we never tried" from "we tried and failed".
   */
  skippedReason: string | null;
  /** Persistence outcome — `null` on success, error string on failure. */
  persistError: string | null;
}

const LOG_PREFIX = '[capinfra.integrity-pager-wiring-check]';

let warnedNoOwner = false;

/**
 * Read `INTEGRITY_PAGER_WIRING_OWNER_EMAIL` the same way the integrity
 * pager reads its own recipient list — comma separated, whitespace
 * trimmed, empties dropped.
 */
export function readIntegrityPagerWiringOwnerEmails(): string[] {
  const raw = process.env.INTEGRITY_PAGER_WIRING_OWNER_EMAIL ?? '';
  return raw
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

/**
 * Determine which paging channels the env vars claim are configured.
 * Shares the env-var read helpers with the pager itself so the wiring
 * check can never disagree with what the pager actually sees.
 */
export function getExpectedPagerChannels(): WiringCheckChannel[] {
  const expected: WiringCheckChannel[] = [];
  if (readIntegrityAlertEmailRecipients().length > 0) expected.push('email');
  if (readIntegrityAlertDiscordWebhook().length > 0) expected.push('discord');
  return expected;
}

function buildSyntheticPayload(actor: string) {
  const ts = new Date().toISOString();
  return {
    assetId: SYNTHETIC_WIRING_CHECK_ASSET_ID,
    symbol: SYNTHETIC_WIRING_CHECK_SYMBOL,
    assetType: null,
    kind: SYNTHETIC_WIRING_CHECK_KIND,
    detail:
      'Scheduled integrity pager wiring check. No real asset is affected; this fires on a cron cadence so silent rotation breakage is caught before a real auto-freeze.',
    rationale:
      `[${ts}] Scheduled wiring check by ${actor}. No real asset is affected.`.slice(
        0,
        2000,
      ),
    previousClass: 'GREEN' as const,
    actor,
    correlationId: `wiring_check_${ts}`,
    testPage: true,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildOwnerSubject(r: {
  expected: string[];
  channelsPaged: string[];
  missing: string[];
  errors: string[];
  skippedNoChannels: boolean;
}): string {
  if (r.skippedNoChannels) {
    return '[ALERT] Integrity pager wiring check FAILED — no channels configured';
  }
  const parts: string[] = [];
  if (r.missing.length > 0) parts.push(`missing=${r.missing.join('+')}`);
  if (r.errors.length > 0) parts.push(`errors=${r.errors.length}`);
  const summary = parts.length > 0 ? ` (${parts.join(', ')})` : '';
  return `[ALERT] Integrity pager wiring check FAILED${summary}`;
}

function buildOwnerHtml(r: {
  ranAt: string;
  expected: string[];
  channelsPaged: string[];
  missing: string[];
  errors: string[];
  skippedNoChannels: boolean;
}): string {
  const expected = r.expected.length > 0 ? r.expected.join(', ') : 'none';
  const reached = r.channelsPaged.length > 0 ? r.channelsPaged.join(', ') : 'none';
  const missing = r.missing.length > 0 ? r.missing.join(', ') : '—';
  const errorList =
    r.errors.length > 0
      ? `<ul style="margin:0;padding-left:20px;color:#7f1d1d;">${r.errors
          .map((e) => `<li style="margin:4px 0;">${escapeHtml(e)}</li>`)
          .join('')}</ul>`
      : '<span style="color:#9ca3af;">—</span>';

  const banner = r.skippedNoChannels
    ? `<p style="color:#7f1d1d;font-size:14px;line-height:1.6;margin:0 0 16px 0;font-weight:600;">
         Neither <code>INTEGRITY_ALERT_EMAIL</code> nor
         <code>INTEGRITY_ALERT_DISCORD_WEBHOOK</code> is configured.
         A real <code>collateral.integrity_failed</code> event would not
         wake on-call.
       </p>`
    : `<p style="color:#7f1d1d;font-size:14px;line-height:1.6;margin:0 0 16px 0;font-weight:600;">
         The scheduled synthetic on-call page did not reach every
         configured channel. Fix the channel(s) below and re-run the
         wiring check before considering the rotation complete.
       </p>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.12);">
        <tr>
          <td style="background:#7f1d1d;padding:28px 32px;">
            <p style="color:#fecaca;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 6px 0;">AXIOM PROTOCOL — RUNBOOK OWNER ALERT</p>
            <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;line-height:1.3;">Integrity pager wiring check failed</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${banner}
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;margin:0 0 24px 0;">
              <tr><td style="padding:18px 22px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">Ran at</td>
                    <td style="font-size:12px;color:#111827;text-align:right;padding:4px 0;font-family:monospace;">${escapeHtml(r.ranAt)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">Expected channels</td>
                    <td style="font-size:12px;color:#111827;text-align:right;padding:4px 0;font-family:monospace;">${escapeHtml(expected)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">Channels reached</td>
                    <td style="font-size:12px;color:#111827;text-align:right;padding:4px 0;font-family:monospace;">${escapeHtml(reached)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">Missing channels</td>
                    <td style="font-size:12px;color:#7f1d1d;font-weight:700;text-align:right;padding:4px 0;font-family:monospace;">${escapeHtml(missing)}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style="color:#374151;font-size:13px;line-height:1.6;margin:0 0 12px 0;">
              <strong>Per-channel errors</strong>
            </p>
            ${errorList}
            <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:24px 0 0 0;">
              You are receiving this because your address is configured in
              <code>INTEGRITY_PAGER_WIRING_OWNER_EMAIL</code>. This channel
              is intentionally separate from the pager itself so an alert
              about a broken pager cannot be delivered through the broken
              pager.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;">
            <p style="font-size:11px;color:#9ca3af;letter-spacing:.08em;margin:0;">AXIOM PROTOCOL — axiomprotocol.app</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

interface OwnerNotifyOutcome {
  notified: boolean;
  error: string | null;
}

async function notifyRunbookOwner(opts: {
  ranAt: string;
  expected: WiringCheckChannel[];
  channelsPaged: string[];
  missing: WiringCheckChannel[];
  pagerErrors: string[];
  skippedNoChannels: boolean;
}): Promise<OwnerNotifyOutcome> {
  const recipients = readIntegrityPagerWiringOwnerEmails();
  if (recipients.length === 0) {
    if (!warnedNoOwner) {
      warnedNoOwner = true;
      console.warn(
        `${LOG_PREFIX} INTEGRITY_PAGER_WIRING_OWNER_EMAIL is not configured; ` +
          'wiring-check failures will be silently persisted but not emailed. ' +
          "Set this to a SEPARATE address (not the on-call rotation alias) so the alert about a broken pager doesn't go through the broken pager.",
      );
    }
    return { notified: false, error: null };
  }
  try {
    const { client, fromEmail } = await getResendClient();
    const subject = buildOwnerSubject({
      expected: opts.expected,
      channelsPaged: opts.channelsPaged,
      missing: opts.missing,
      errors: opts.pagerErrors,
      skippedNoChannels: opts.skippedNoChannels,
    });
    const html = buildOwnerHtml({
      ranAt: opts.ranAt,
      expected: opts.expected,
      channelsPaged: opts.channelsPaged,
      missing: opts.missing,
      errors: opts.pagerErrors,
      skippedNoChannels: opts.skippedNoChannels,
    });
    await client.emails.send({
      from: fromEmail,
      to: recipients,
      subject,
      html,
    });
    return { notified: true, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} owner-notification email failed`, err);
    return { notified: false, error: msg };
  }
}

async function persistRun(
  result: WiringCheckResult,
  triggeredBy: string,
): Promise<string | null> {
  try {
    await pool.query(
      `INSERT INTO integrity_pager_wiring_check_runs (
         ran_at, ok, expected_channels, channels_paged, pager_errors,
         missing_channels, owner_notified, owner_notify_error,
         owner_email_configured, skipped_reason, triggered_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        result.ranAt,
        result.ok,
        result.expectedChannels,
        result.channelsPaged,
        result.pagerErrors,
        result.missingChannels,
        result.ownerNotified,
        result.ownerNotifyError,
        result.ownerEmailConfigured,
        result.skippedReason,
        triggeredBy,
      ],
    );
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} failed to persist wiring-check run`, err);
    return msg;
  }
}

export interface RunWiringCheckOptions {
  /** Actor stamp embedded in the synthetic payload. */
  actor?: string;
  /** Provenance label persisted on the audit row. */
  triggeredBy?: string;
}

/**
 * Execute one wiring-check cycle: fire the synthetic on-call page,
 * compare the outcome to what the env vars say should have happened,
 * notify the runbook owner if the result is unhealthy, and persist
 * the run for the operator dashboard.
 *
 * Always resolves; channel errors and DB errors are surfaced inside
 * the returned envelope rather than thrown.
 */
export async function runIntegrityPagerWiringCheck(
  opts: RunWiringCheckOptions = {},
): Promise<WiringCheckResult> {
  const actor = opts.actor ?? DEFAULT_WIRING_CHECK_ACTOR;
  const triggeredBy = opts.triggeredBy ?? 'scheduler';
  const ranAt = new Date().toISOString();
  const expected = getExpectedPagerChannels();

  const payload = buildSyntheticPayload(actor);
  const pagerResult = await pageOnCallForIntegrityFailure(payload);

  const channelsPaged = pagerResult.channelsPaged;
  const pagerErrors = pagerResult.errors;
  const missing: WiringCheckChannel[] = expected.filter(
    (c) => !channelsPaged.includes(c),
  );
  const skippedNoChannels = pagerResult.skipped;
  const skippedReason: string | null = skippedNoChannels
    ? 'no_channels_configured'
    : null;

  // ok = every expected channel was reached AND no channel errored AND
  // at least one channel was actually configured. If no channels are
  // configured the call is degenerate (nothing to verify) and we treat
  // it as a failure so the runbook owner is told.
  const ok =
    !skippedNoChannels && pagerErrors.length === 0 && missing.length === 0;

  const ownerEmailConfigured =
    readIntegrityPagerWiringOwnerEmails().length > 0;

  let ownerNotified = false;
  let ownerNotifyError: string | null = null;
  if (!ok) {
    const outcome = await notifyRunbookOwner({
      ranAt,
      expected,
      channelsPaged,
      missing,
      pagerErrors,
      skippedNoChannels,
    });
    ownerNotified = outcome.notified;
    ownerNotifyError = outcome.error;
  }

  const result: WiringCheckResult = {
    ranAt,
    ok,
    expectedChannels: expected,
    channelsPaged,
    pagerErrors,
    missingChannels: missing,
    ownerNotified,
    ownerNotifyError,
    ownerEmailConfigured,
    skippedReason,
    persistError: null,
  };

  result.persistError = await persistRun(result, triggeredBy);
  return result;
}

export interface WiringCheckRunRecord {
  ranAt: string;
  ok: boolean;
  expectedChannels: string[];
  channelsPaged: string[];
  pagerErrors: string[];
  missingChannels: string[];
  ownerNotified: boolean;
  ownerNotifyError: string | null;
  ownerEmailConfigured: boolean;
  skippedReason: string | null;
  triggeredBy: string;
}

interface WiringCheckRowShape {
  ran_at: Date | string;
  ok: boolean;
  expected_channels: string[] | null;
  channels_paged: string[] | null;
  pager_errors: string[] | null;
  missing_channels: string[] | null;
  owner_notified: boolean;
  owner_notify_error: string | null;
  owner_email_configured: boolean;
  skipped_reason: string | null;
  triggered_by: string;
}

function rowToRecord(row: WiringCheckRowShape): WiringCheckRunRecord {
  const ranAt =
    row.ran_at instanceof Date ? row.ran_at.toISOString() : String(row.ran_at);
  return {
    ranAt,
    ok: row.ok,
    expectedChannels: row.expected_channels ?? [],
    channelsPaged: row.channels_paged ?? [],
    pagerErrors: row.pager_errors ?? [],
    missingChannels: row.missing_channels ?? [],
    ownerNotified: row.owner_notified,
    ownerNotifyError: row.owner_notify_error,
    ownerEmailConfigured: row.owner_email_configured,
    skippedReason: row.skipped_reason,
    triggeredBy: row.triggered_by,
  };
}

/**
 * Read the most recent wiring-check run from the audit table, or
 * `null` if the table is empty / unavailable. Always resolves so the
 * operator dashboard renders even when the DB read fails.
 */
export async function getLastIntegrityPagerWiringCheckRun(): Promise<WiringCheckRunRecord | null> {
  try {
    const result = await pool.query<WiringCheckRowShape>(
      `SELECT ran_at, ok, expected_channels, channels_paged, pager_errors,
              missing_channels, owner_notified, owner_notify_error,
              owner_email_configured, skipped_reason, triggered_by
         FROM integrity_pager_wiring_check_runs
        ORDER BY ran_at DESC
        LIMIT 1`,
    );
    const row = result.rows[0];
    return row ? rowToRecord(row) : null;
  } catch (err) {
    console.error(`${LOG_PREFIX} read last wiring-check run failed`, err);
    return null;
  }
}

/** Test-only: clear the once-per-process "no owner" warning latch. */
export function __resetWiringCheckWarningsForTests(): void {
  warnedNoOwner = false;
}
