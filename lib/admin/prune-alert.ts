/**
 * Prune overdue alert module.
 *
 * Checks whether the oracle-fallback pruning job has run within the
 * expected window (PRUNE_STALE_HOURS). If overdue, fires notifications
 * to configured channels:
 *
 *   - Email  → Resend, sent to PRUNE_ALERT_EMAIL (comma-separated list)
 *   - Discord → webhook POST to PRUNE_ALERT_DISCORD_WEBHOOK
 *
 * Both channels are optional; if neither is configured the function
 * returns without sending anything (and logs a warning).
 */

import { pool } from '../../server/db';
import { PRUNE_STALE_HOURS, getPruneAlertLogRetentionDays } from './config';
import { getResendClient } from '../email/resend';

export interface PruneAlertStatus {
  isOverdue: boolean;
  status: 'ok' | 'stale' | 'never_run';
  lastPrunedAt: string | null;
  hoursSincePrune: number | null;
  thresholdHours: number;
}

export interface AlertResult {
  alertStatus: PruneAlertStatus;
  notificationsSent: string[];
  errors: string[];
  skipped: boolean;
}

/**
 * Queries the prune history and returns the current health status.
 */
export async function getPruneStatus(): Promise<PruneAlertStatus> {
  const result = await pool.query<{ pruned_at: string }>(
    `SELECT pruned_at FROM oracle_fallback_prune_history ORDER BY pruned_at DESC LIMIT 1`,
  );

  const lastRow = result.rows[0] ?? null;

  if (!lastRow) {
    return {
      isOverdue: true,
      status: 'never_run',
      lastPrunedAt: null,
      hoursSincePrune: null,
      thresholdHours: PRUNE_STALE_HOURS,
    };
  }

  const hoursSince =
    (Date.now() - new Date(lastRow.pruned_at).getTime()) / (1000 * 60 * 60);
  const isStale = hoursSince >= PRUNE_STALE_HOURS;

  return {
    isOverdue: isStale,
    status: isStale ? 'stale' : 'ok',
    lastPrunedAt: lastRow.pruned_at,
    hoursSincePrune: Math.round(hoursSince * 10) / 10,
    thresholdHours: PRUNE_STALE_HOURS,
  };
}

function buildDashboardUrl(): string {
  const domain = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.NEXT_PUBLIC_APP_URL ?? 'https://axiomprotocol.app';
  return `${domain}/admin/oracle-fallbacks`;
}

function formatLastPruned(status: PruneAlertStatus): string {
  if (status.status === 'never_run') return 'Never';
  if (!status.lastPrunedAt) return 'Unknown';
  return new Date(status.lastPrunedAt).toUTCString();
}

function buildAlertSummary(status: PruneAlertStatus): string {
  const lastPruned = formatLastPruned(status);
  const hours =
    status.hoursSincePrune !== null
      ? `${status.hoursSincePrune}h ago`
      : 'never';
  return status.status === 'never_run'
    ? 'The oracle-fallback pruning job has NEVER run.'
    : `The oracle-fallback pruning job last ran ${hours} (${lastPruned}), exceeding the ${status.thresholdHours}h threshold.`;
}

/**
 * Sends an email alert via Resend.
 * Requires the Resend integration to be connected (lib/email/resend.ts).
 * Recipients are read from the PRUNE_ALERT_EMAIL env var (comma-separated).
 */
async function sendEmailAlert(status: PruneAlertStatus): Promise<void> {
  const rawEmails = process.env.PRUNE_ALERT_EMAIL ?? '';
  const recipients = rawEmails
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  if (recipients.length === 0) {
    throw new Error('PRUNE_ALERT_EMAIL is not configured — skipping email');
  }

  const { client, fromEmail } = await getResendClient();

  const dashboardUrl = buildDashboardUrl();
  const summary = buildAlertSummary(status);
  const lastPruned = formatLastPruned(status);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.12);">
        <tr>
          <td style="background:#b91c1c;padding:28px 32px;">
            <p style="color:#fecaca;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 6px 0;">AXIOM PROTOCOL — SYSTEM ALERT</p>
            <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;line-height:1.3;">Oracle-Fallback Pruning Overdue</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="color:#111827;font-size:15px;line-height:1.6;margin:0 0 20px 0;">${summary}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;margin:0 0 24px 0;">
              <tr><td style="padding:18px 22px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">Status</td>
                    <td style="font-size:12px;color:#b91c1c;font-weight:700;text-align:right;padding:4px 0;text-transform:uppercase;">${status.status}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">Last Pruned</td>
                    <td style="font-size:12px;color:#111827;font-weight:600;text-align:right;padding:4px 0;">${lastPruned}</td>
                  </tr>
                  ${status.hoursSincePrune !== null ? `<tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">Hours Since Prune</td>
                    <td style="font-size:12px;color:#b91c1c;font-weight:700;text-align:right;padding:4px 0;">${status.hoursSincePrune}h</td>
                  </tr>` : ''}
                  <tr>
                    <td style="font-size:12px;color:#6b7280;padding:4px 0;">Threshold</td>
                    <td style="font-size:12px;color:#111827;text-align:right;padding:4px 0;">${status.thresholdHours}h</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
              <tr>
                <td align="center">
                  <a href="${dashboardUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:14px;">
                    Open Admin Dashboard →
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;">
              This alert was triggered because the pruning health check returned <code>ok: false</code>.<br>
              To silence future alerts, ensure the prune scheduler is running and check
              <a href="${dashboardUrl}" style="color:#6b7280;">${dashboardUrl}</a>.
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

  await client.emails.send({
    from: fromEmail,
    to: recipients,
    subject: `[ALERT] Oracle-Fallback Pruning Overdue — ${status.status.toUpperCase()}`,
    html,
  });
}

/**
 * Sends a Discord webhook alert.
 * Requires PRUNE_ALERT_DISCORD_WEBHOOK env var to be set.
 */
async function sendDiscordAlert(status: PruneAlertStatus): Promise<void> {
  const webhookUrl = process.env.PRUNE_ALERT_DISCORD_WEBHOOK ?? '';
  if (!webhookUrl) {
    throw new Error(
      'PRUNE_ALERT_DISCORD_WEBHOOK is not configured — skipping Discord',
    );
  }

  const dashboardUrl = buildDashboardUrl();
  const summary = buildAlertSummary(status);
  const lastPruned = formatLastPruned(status);

  const fields: Array<{ name: string; value: string; inline: boolean }> = [
    { name: 'Status', value: status.status.toUpperCase(), inline: true },
    { name: 'Last Pruned', value: lastPruned, inline: true },
    {
      name: 'Threshold',
      value: `${status.thresholdHours}h`,
      inline: true,
    },
  ];

  if (status.hoursSincePrune !== null) {
    fields.splice(2, 0, {
      name: 'Hours Since Prune',
      value: `${status.hoursSincePrune}h`,
      inline: true,
    });
  }

  const payload = {
    username: 'Axiom Protocol',
    embeds: [
      {
        title: 'Oracle-Fallback Pruning Overdue',
        description: summary,
        color: 0xb91c1c,
        fields,
        url: dashboardUrl,
        footer: {
          text: 'Axiom Protocol — Prune Health Monitor',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const res = await fetch(webhookUrl, {
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
 * Deletes prune_alert_log rows older than the configured retention window
 * (PRUNE_ALERT_LOG_RETENTION_DAYS, default 90 days) by calling the
 * prune_prune_alert_log() SQL function defined in migration 0048.
 *
 * Returns the number of rows deleted. Resolves rather than throws so callers
 * can wire it into the scheduler endpoint without risking the alert path.
 */
export async function pruneAlertLogRetention(): Promise<{
  deletedCount: number;
  retentionDays: number;
  error: string | null;
}> {
  const retentionDays = getPruneAlertLogRetentionDays();
  try {
    const result = await pool.query<{ deleted_count: string }>(
      "SELECT deleted_count FROM prune_prune_alert_log($1, 'http')",
      [retentionDays],
    );
    const deletedCount = parseInt(result.rows[0]?.deleted_count ?? '0', 10);
    if (deletedCount > 0) {
      console.log(
        `[prune-alert] Pruned ${deletedCount} prune_alert_log rows older than ${retentionDays} days`,
      );
    }
    return { deletedCount, retentionDays, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[prune-alert] prune_alert_log cleanup failed:', err);
    return { deletedCount: 0, retentionDays, error: msg };
  }
}

export interface PruneAlertLogCleanupRun {
  ranAt: string;
  deletedCount: number;
  retentionDays: number;
  triggeredBy: string;
}

export interface PruneAlertLogStatus {
  rowCount: number;
  retentionDays: number;
  lastCleanup: PruneAlertLogCleanupRun | null;
  cleanupHistory: PruneAlertLogCleanupRun[];
}

/**
 * Reads the operational state of the prune_alert_log retention pipeline so
 * the admin dashboard can show how big the table currently is, when the
 * last cleanup ran, and what retention window is configured.
 *
 * Resolves rather than throws — callers (the admin API handler) treat any
 * DB error as a non-fatal, surfacing null/zero values to the UI.
 */
export async function getPruneAlertLogStatus(): Promise<PruneAlertLogStatus> {
  const retentionDays = getPruneAlertLogRetentionDays();
  const [countResult, historyResult] = await Promise.all([
    pool.query<{ row_count: string }>(
      'SELECT COUNT(*)::TEXT AS row_count FROM prune_alert_log',
    ),
    pool.query<{
      ran_at: string;
      deleted_count: string;
      retention_days: number;
      triggered_by: string;
    }>(
      `SELECT ran_at, deleted_count, retention_days, triggered_by
       FROM prune_alert_log_cleanup_history
       ORDER BY ran_at DESC
       LIMIT 30`,
    ),
  ]);

  const rowCount = parseInt(countResult.rows[0]?.row_count ?? '0', 10);
  const cleanupHistory: PruneAlertLogCleanupRun[] = historyResult.rows.map(
    (row) => ({
      ranAt: row.ran_at,
      deletedCount: Number(row.deleted_count),
      retentionDays: row.retention_days,
      triggeredBy: row.triggered_by,
    }),
  );

  return {
    rowCount,
    retentionDays,
    lastCleanup: cleanupHistory[0] ?? null,
    cleanupHistory,
  };
}

/**
 * Main entry point.
 *
 * Checks whether pruning is overdue and, if so, fires configured alerts.
 * Always resolves (never throws) so callers can safely await the result.
 */
export async function checkAndSendPruneOverdueAlert(): Promise<AlertResult> {
  const notificationsSent: string[] = [];
  const errors: string[] = [];

  let alertStatus: PruneAlertStatus;
  try {
    alertStatus = await getPruneStatus();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[prune-alert] Failed to query prune status:', err);
    return {
      alertStatus: {
        isOverdue: false,
        status: 'ok',
        lastPrunedAt: null,
        hoursSincePrune: null,
        thresholdHours: PRUNE_STALE_HOURS,
      },
      notificationsSent: [],
      errors: [`DB error: ${msg}`],
      skipped: true,
    };
  }

  if (!alertStatus.isOverdue) {
    console.log(
      `[prune-alert] Pruning is healthy (${alertStatus.status}); no alert needed.`,
    );
    return { alertStatus, notificationsSent, errors, skipped: true };
  }

  const emailConfigured = !!(process.env.PRUNE_ALERT_EMAIL ?? '').trim();
  const discordConfigured = !!(
    process.env.PRUNE_ALERT_DISCORD_WEBHOOK ?? ''
  ).trim();

  if (!emailConfigured && !discordConfigured) {
    console.warn(
      '[prune-alert] Pruning is overdue but no alert channels are configured. ' +
        'Set PRUNE_ALERT_EMAIL and/or PRUNE_ALERT_DISCORD_WEBHOOK to enable alerts.',
    );
    return { alertStatus, notificationsSent, errors, skipped: true };
  }

  console.warn(
    `[prune-alert] Pruning is OVERDUE (${alertStatus.status}). Firing alerts...`,
  );

  if (emailConfigured) {
    try {
      await sendEmailAlert(alertStatus);
      notificationsSent.push('email');
      console.log('[prune-alert] Email alert sent.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[prune-alert] Email alert failed:', err);
      errors.push(`email: ${msg}`);
    }
  }

  if (discordConfigured) {
    try {
      await sendDiscordAlert(alertStatus);
      notificationsSent.push('discord');
      console.log('[prune-alert] Discord alert sent.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[prune-alert] Discord alert failed:', err);
      errors.push(`discord: ${msg}`);
    }
  }

  return { alertStatus, notificationsSent, errors, skipped: false };
}
