/**
 * Capital Infrastructure — On-call pager for collateral integrity failures.
 *
 * The integrity producer (`lib/capinfra/risk/integrity.ts`) already
 * persists a HIGH-severity `collateral.integrity_failed` notification
 * row on the `operator` channel. That row is what the operator console
 * panel reads, but it only wakes someone if they happen to be logged
 * in. This module fans the same event out to the on-call paging
 * channels — email (via Resend) and/or Discord webhook — so a real
 * person is woken even if nobody is staring at the dashboard.
 *
 * Channels are configured via env vars:
 *   - `INTEGRITY_ALERT_EMAIL`           (comma-separated recipients)
 *   - `INTEGRITY_ALERT_DISCORD_WEBHOOK` (Discord-compatible webhook URL)
 *
 * Both are optional. If neither is set the call is a no-op (and logs
 * a warning the first time per process so misconfiguration is visible
 * but not deafening). This mirrors the prune-overdue alert pipeline
 * (`lib/admin/prune-alert.ts`) so operators only have to learn one
 * configuration model.
 *
 * Best-effort guarantees (per Collateral Risk Policy §0.1 / task #235):
 *   - Never throws. Channel failures are caught, logged, returned in
 *     the result object so callers/tests can inspect them, and never
 *     bubble back into the asset downgrade path.
 *   - Runs AFTER the integrity transaction commits — the dispatcher
 *     does not see, and cannot block, the DB write.
 *   - Does its own deduplication only via the upstream caller; the
 *     integrity producer already has a 5-minute (asset, kind) window.
 */

import { getResendClient } from '../../email/resend';
import {
  readIntegrityAlertDiscordWebhook,
  readIntegrityAlertEmailRecipients,
} from './integrityPagerStatus';

export interface IntegrityPagerPayload {
  /** Affected asset id (always present). */
  assetId: string;
  /** Affected asset symbol; null if it could not be looked up. */
  symbol: string | null;
  /** Failure-mode discriminator from the integrity producer. */
  kind: string;
  /** Free-form detail string passed to `recordIntegrityFailure`. */
  detail: string;
  /** Pre-formatted rationale, including timestamp + kind prefix. */
  rationale: string;
  /** Asset's collateral class before the integrity flip. */
  previousClass: 'GREEN' | 'YELLOW' | 'RED';
  /** Actor that recorded the failure (operator id, monitor name, …). */
  actor: string;
  /** Optional correlation id linking back to the audit event. */
  correlationId?: string | null;
  /** Asset type (e.g. 'STABLE', 'TBILL', …); informational only. */
  assetType?: string | null;
  /**
   * When `true` this is a synthetic on-call wiring verification page
   * triggered by an operator (see `/api/capinfra/risk/integrity/test-page`).
   * Recipients see a `[TEST PAGE]` subject prefix, a distinct banner in
   * the email body, and a clearly-labelled Discord embed so on-call can
   * unambiguously distinguish a wiring test from a real auto-freeze.
   */
  testPage?: boolean;
}

export interface IntegrityPagerResult {
  /** Names of channels that were successfully paged. */
  channelsPaged: string[];
  /** Per-channel error strings (`'<channel>: <message>'`). */
  errors: string[];
  /**
   * `true` when no channels were configured — useful for tests and
   * for the integrity producer's logs so a missing env var doesn't
   * look like a silent failure.
   */
  skipped: boolean;
}

const PAGER_LOG_PREFIX = '[capinfra.integrity-pager]';

let warnedNoChannels = false;

// Env-var reads are now centralized in `./integrityPagerStatus.ts`
// so the dashboard banner (Task #305) and the pager itself can never
// disagree about whether a channel is configured.
const readEmailRecipients = readIntegrityAlertEmailRecipients;
const readDiscordWebhook = readIntegrityAlertDiscordWebhook;

function buildDashboardUrl(): string {
  const domain = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'https://axiomprotocol.app';
  return `${domain}/operator`;
}

function buildSubject(p: IntegrityPagerPayload): string {
  const label = p.symbol ?? p.assetId;
  if (p.testPage) {
    return `[TEST PAGE] Integrity pager wiring check: ${label} (${p.kind})`;
  }
  return `[PAGE] Asset auto-frozen to RED: ${label} (${p.kind})`;
}

function buildPlainSummary(p: IntegrityPagerPayload): string {
  const label = p.symbol ? `${p.symbol} (${p.assetId})` : p.assetId;
  if (p.testPage) {
    return (
      `TEST PAGE — synthetic on-call wiring verification triggered by ${p.actor}. ` +
      `No real asset was frozen; if you received this, the channel is healthy. ` +
      `Synthetic asset: ${label}. Reason: ${p.kind}. Detail: ${p.detail}`
    );
  }
  return (
    `Asset ${label} was automatically downgraded from ${p.previousClass} to RED ` +
    `by ${p.actor}. Reason: ${p.kind}. Detail: ${p.detail}`
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(p: IntegrityPagerPayload): string {
  const dashboardUrl = buildDashboardUrl();
  const summary = escapeHtml(buildPlainSummary(p));
  const rationale = escapeHtml(p.rationale);
  const symbol = escapeHtml(p.symbol ?? '—');
  const assetId = escapeHtml(p.assetId);
  const kind = escapeHtml(p.kind);
  const previousClass = escapeHtml(p.previousClass);
  const actor = escapeHtml(p.actor);
  const correlationId = escapeHtml(p.correlationId ?? '—');

  const isTest = p.testPage === true;
  const headerBg = isTest ? '#1e3a5f' : '#7f1d1d';
  const headerLabelColor = isTest ? '#bfdbfe' : '#fecaca';
  const headerEyebrow = isTest
    ? 'AXIOM PROTOCOL — TEST PAGE (NO ACTION REQUIRED)'
    : 'AXIOM PROTOCOL — COLLATERAL EMERGENCY';
  const headerTitle = isTest
    ? 'TEST PAGE — Integrity pager wiring check'
    : 'Asset Auto-Frozen to RED';
  const testBanner = isTest
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #93c5fd;border-radius:6px;margin:0 0 20px 0;">
            <tr><td style="padding:14px 18px;">
              <p style="color:#1e3a5f;font-size:13px;line-height:1.5;margin:0;font-weight:600;">
                Synthetic on-call wiring verification — no asset is frozen and no operator action is required.
              </p>
            </td></tr>
          </table>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.12);">
        <tr>
          <td style="background:${headerBg};padding:28px 32px;">
            <p style="color:${headerLabelColor};font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 6px 0;">${headerEyebrow}</p>
            <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;line-height:1.3;">${headerTitle}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${testBanner}
            <p style="color:#111827;font-size:15px;line-height:1.6;margin:0 0 20px 0;">${summary}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;margin:0 0 24px 0;">
              <tr><td style="padding:18px 22px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">Asset</td>
                    <td style="font-size:12px;color:#111827;font-weight:700;text-align:right;padding:4px 0;font-family:monospace;">${symbol}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">Asset ID</td>
                    <td style="font-size:12px;color:#111827;text-align:right;padding:4px 0;font-family:monospace;">${assetId}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">Failure Kind</td>
                    <td style="font-size:12px;color:#7f1d1d;font-weight:700;text-align:right;padding:4px 0;">${kind}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">Previous Class</td>
                    <td style="font-size:12px;color:#111827;text-align:right;padding:4px 0;">${previousClass}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">New Class</td>
                    <td style="font-size:12px;color:#7f1d1d;font-weight:700;text-align:right;padding:4px 0;">RED</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">Actor</td>
                    <td style="font-size:12px;color:#111827;text-align:right;padding:4px 0;font-family:monospace;">${actor}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">Correlation</td>
                    <td style="font-size:12px;color:#111827;text-align:right;padding:4px 0;font-family:monospace;">${correlationId}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style="color:#374151;font-size:13px;line-height:1.6;margin:0 0 24px 0;">
              <strong>Rationale:</strong><br>
              <span style="font-family:monospace;color:#111827;">${rationale}</span>
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
              <tr>
                <td align="center">
                  <a href="${dashboardUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:14px;">
                    Open Operator Console →
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;">
              ${
                isTest
                  ? 'No collateral state was changed by this message. The synthetic asset id is not a real asset; nothing was frozen and no policy state needs to be reverted.'
                  : 'The asset is already RED in the policy evaluator; new BORROW authorizations against it deny with COLLATERAL_CLASS_RED. Re-admission must go through the audited policy publication flow.'
              }
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

async function pageEmail(p: IntegrityPagerPayload): Promise<void> {
  const recipients = readEmailRecipients();
  if (recipients.length === 0) {
    throw new Error('INTEGRITY_ALERT_EMAIL is not configured');
  }
  const { client, fromEmail } = await getResendClient();
  await client.emails.send({
    from: fromEmail,
    to: recipients,
    subject: buildSubject(p),
    html: buildEmailHtml(p),
  });
}

async function pageDiscord(p: IntegrityPagerPayload): Promise<void> {
  const webhook = readDiscordWebhook();
  if (!webhook) {
    throw new Error('INTEGRITY_ALERT_DISCORD_WEBHOOK is not configured');
  }
  const dashboardUrl = buildDashboardUrl();
  const fields: Array<{ name: string; value: string; inline: boolean }> = [
    { name: 'Asset', value: p.symbol ?? p.assetId, inline: true },
    { name: 'Failure Kind', value: p.kind, inline: true },
    { name: 'Previous Class', value: p.previousClass, inline: true },
    { name: 'New Class', value: 'RED', inline: true },
    { name: 'Actor', value: p.actor, inline: true },
    {
      name: 'Correlation',
      value: p.correlationId ?? '—',
      inline: true,
    },
    {
      name: 'Rationale',
      // Discord embeds cap field values at 1024 chars; rationale is
      // already capped at 2000 by the producer, so trim defensively.
      value: p.rationale.slice(0, 1024),
      inline: false,
    },
  ];

  const isTest = p.testPage === true;
  const embedTitle = isTest
    ? 'TEST PAGE — Integrity pager wiring check'
    : 'Asset auto-frozen to RED';
  const embedColor = isTest ? 0x1e3a5f : 0x7f1d1d;
  const embedFooter = isTest
    ? 'Axiom Protocol — Synthetic on-call wiring verification (no action required)'
    : 'Axiom Protocol — Collateral Integrity Monitor';

  const payload = {
    username: 'Axiom Protocol',
    embeds: [
      {
        title: embedTitle,
        description: buildPlainSummary(p).slice(0, 2048),
        color: embedColor,
        fields,
        url: dashboardUrl,
        footer: { text: embedFooter },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Discord webhook returned HTTP ${res.status}: ${body.slice(0, 200)}`,
    );
  }
}

/**
 * Fan a `collateral.integrity_failed` event out to the configured
 * paging channels. Always resolves; per-channel errors are returned
 * in the result object rather than thrown so this can be safely
 * awaited (or fire-and-forgotten) from the integrity producer.
 *
 * Test-only helpers can read `result.channelsPaged` to assert the
 * expected channels were exercised; production callers can ignore
 * the return value entirely.
 */
export async function pageOnCallForIntegrityFailure(
  payload: IntegrityPagerPayload,
): Promise<IntegrityPagerResult> {
  const channelsPaged: string[] = [];
  const errors: string[] = [];

  const emailConfigured = readEmailRecipients().length > 0;
  const discordConfigured = readDiscordWebhook().length > 0;

  if (!emailConfigured && !discordConfigured) {
    if (!warnedNoChannels) {
      warnedNoChannels = true;
      console.warn(
        `${PAGER_LOG_PREFIX} no paging channels configured; ` +
          'set INTEGRITY_ALERT_EMAIL and/or INTEGRITY_ALERT_DISCORD_WEBHOOK ' +
          'to wake on-call when an asset auto-freezes.',
      );
    }
    return { channelsPaged, errors, skipped: true };
  }

  if (emailConfigured) {
    try {
      await pageEmail(payload);
      channelsPaged.push('email');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${PAGER_LOG_PREFIX} email page failed`, err);
      errors.push(`email: ${msg}`);
    }
  }

  if (discordConfigured) {
    try {
      await pageDiscord(payload);
      channelsPaged.push('discord');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${PAGER_LOG_PREFIX} discord page failed`, err);
      errors.push(`discord: ${msg}`);
    }
  }

  return { channelsPaged, errors, skipped: false };
}

/** Test-only: reset the once-per-process "no channels" warning latch. */
export function __resetIntegrityPagerWarningForTests(): void {
  warnedNoChannels = false;
}
