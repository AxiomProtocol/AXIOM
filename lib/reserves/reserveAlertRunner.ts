/**
 * Reserve Balance Alert Runner
 *
 * Polls two critical reserve conditions and fans alerts out to email
 * (Resend) and/or Discord webhook when a condition first triggers.
 * Deduplication is handled via the `reserve_alerts` PostgreSQL table:
 *   - Alert fires only on the inactive → active edge.
 *   - Once active, further cron runs are silent until the condition clears.
 *   - When the condition clears the row is reset so a future re-trigger
 *     fires a new alert.
 *
 * Conditions monitored:
 *   eth_low      — deployer EOA ETH balance < ETH_LOW_THRESHOLD (0.1 ETH)
 *   axau_depleted — AXAU vault bufferCapacity === 'DEPLETED'
 *
 * Notification channels (env vars):
 *   RESERVE_ALERT_EMAIL           — comma-separated recipient list (Resend)
 *   RESERVE_ALERT_DISCORD_WEBHOOK — Discord webhook URL
 *
 * Falls back to no-op (skipped = true) if neither channel is configured.
 * Never throws — all errors are caught and returned in the result object.
 */

import { ethers } from 'ethers';
import { getResendClient } from '../email/resend';
import { getVaultBuffer } from '../services/AXAUFulfillmentService';
import { DEPLOYER_EOA } from '../../src/config/adminRoles';
import { pool as sharedPool } from '../../server/db';

// ── Constants ──────────────────────────────────────────────────────────────
const ETH_LOW_THRESHOLD = 0.1;
const LOG = '[reserve-alert-runner]';

// ── Env helpers ────────────────────────────────────────────────────────────
function readEmailRecipients(): string[] {
  return (process.env.RESERVE_ALERT_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

function readDiscordWebhook(): string {
  return (process.env.RESERVE_ALERT_DISCORD_WEBHOOK ?? '').trim();
}

function buildDashboardUrl(): string {
  const domain = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'https://axiomprotocol.app').replace(/\/+$/, '');
  return `${domain}/founder-ops`;
}

// ── DB helpers ─────────────────────────────────────────────────────────────
interface AlertRow {
  id: string;
  alert_key: string;
  condition_active: boolean;
  last_sent_at: Date | null;
  condition_first_seen_at: Date | null;
  condition_cleared_at: Date | null;
  last_value_snapshot: string | null;
  channels_paged: string | null;
}

async function getOrCreateRow(alertKey: string): Promise<AlertRow> {
  // Upsert row on first encounter
  await sharedPool.query(
    `INSERT INTO reserve_alerts (alert_key) VALUES ($1)
     ON CONFLICT (alert_key) DO NOTHING`,
    [alertKey],
  );
  const { rows } = await sharedPool.query<AlertRow>(
    `SELECT * FROM reserve_alerts WHERE alert_key = $1`,
    [alertKey],
  );
  return rows[0];
}

async function markActive(alertKey: string, valueSnapshot: string, channelsPaged: string): Promise<void> {
  await sharedPool.query(
    `UPDATE reserve_alerts
     SET condition_active = TRUE,
         last_sent_at = NOW(),
         condition_first_seen_at = NOW(),
         condition_cleared_at = NULL,
         last_value_snapshot = $2,
         channels_paged = $3,
         updated_at = NOW()
     WHERE alert_key = $1`,
    [alertKey, valueSnapshot, channelsPaged],
  );
}

async function markCleared(alertKey: string): Promise<void> {
  await sharedPool.query(
    `UPDATE reserve_alerts
     SET condition_active = FALSE,
         condition_cleared_at = NOW(),
         updated_at = NOW()
     WHERE alert_key = $1`,
    [alertKey],
  );
}

// ── Notification helpers ───────────────────────────────────────────────────
interface AlertPayload {
  alertKey: string;
  title: string;
  summary: string;
  details: Array<{ label: string; value: string }>;
  severity: 'warning' | 'critical';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(p: AlertPayload): string {
  const dashboardUrl = buildDashboardUrl();
  const headerBg = p.severity === 'critical' ? '#7f1d1d' : '#78350f';
  const headerLabelColor = p.severity === 'critical' ? '#fecaca' : '#fde68a';
  const eyebrow = 'AXIOM PROTOCOL — RESERVE BALANCE ALERT';
  const detailRows = p.details
    .map(
      (d) =>
        `<tr>
          <td style="font-size:12px;color:#6b7280;padding:4px 0;">${escapeHtml(d.label)}</td>
          <td style="font-size:12px;color:#111827;font-weight:700;text-align:right;padding:4px 0;font-family:monospace;">${escapeHtml(d.value)}</td>
        </tr>`,
    )
    .join('');
  const tableBg   = p.severity === 'critical' ? '#fef2f2' : '#fffbeb';
  const tableBorder= p.severity === 'critical' ? '#fca5a5' : '#fcd34d';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.12);">
        <tr>
          <td style="background:${headerBg};padding:28px 32px;">
            <p style="color:${headerLabelColor};font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 6px 0;">${eyebrow}</p>
            <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;line-height:1.3;">${escapeHtml(p.title)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="color:#111827;font-size:15px;line-height:1.6;margin:0 0 20px 0;">${escapeHtml(p.summary)}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:${tableBg};border:1px solid ${tableBorder};border-radius:6px;margin:0 0 24px 0;">
              <tr><td style="padding:18px 22px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${detailRows}
                </table>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
              <tr>
                <td align="center">
                  <a href="${dashboardUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:14px;">
                    Open Founder Ops Console →
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;">
              This alert fires once when the condition is first detected. A follow-up alert will be sent if the condition clears and re-triggers.
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

async function notifyEmail(p: AlertPayload): Promise<void> {
  const recipients = readEmailRecipients();
  if (recipients.length === 0) throw new Error('RESERVE_ALERT_EMAIL not configured');
  const { client, fromEmail } = await getResendClient();
  await client.emails.send({
    from: fromEmail,
    to: recipients,
    subject: `[RESERVE ALERT] ${p.title}`,
    html: buildEmailHtml(p),
  });
}

async function notifyDiscord(p: AlertPayload): Promise<void> {
  const webhook = readDiscordWebhook();
  if (!webhook) throw new Error('RESERVE_ALERT_DISCORD_WEBHOOK not configured');
  const dashboardUrl = buildDashboardUrl();
  const color = p.severity === 'critical' ? 0x7f1d1d : 0x78350f;
  const fields = p.details.map((d) => ({
    name: d.label,
    value: d.value,
    inline: true,
  }));
  const payload = {
    username: 'Axiom Protocol',
    embeds: [{
      title: `⚠ ${p.title}`,
      description: p.summary.slice(0, 2048),
      color,
      fields,
      url: dashboardUrl,
      footer: { text: 'Axiom Protocol — Reserve Balance Monitor' },
      timestamp: new Date().toISOString(),
    }],
  };
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Discord webhook HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
}

async function fanOut(p: AlertPayload): Promise<{ channelsPaged: string[]; errors: string[] }> {
  const emailConfigured   = readEmailRecipients().length > 0;
  const discordConfigured = !!readDiscordWebhook();
  const channelsPaged: string[] = [];
  const errors: string[] = [];

  if (!emailConfigured && !discordConfigured) {
    return { channelsPaged, errors };
  }
  if (emailConfigured) {
    try { await notifyEmail(p); channelsPaged.push('email'); }
    catch (e: unknown) { errors.push(`email: ${(e as Error).message}`); console.error(`${LOG} email failed`, e); }
  }
  if (discordConfigured) {
    try { await notifyDiscord(p); channelsPaged.push('discord'); }
    catch (e: unknown) { errors.push(`discord: ${(e as Error).message}`); console.error(`${LOG} discord failed`, e); }
  }
  return { channelsPaged, errors };
}

// ── Condition definitions ──────────────────────────────────────────────────
interface ConditionResult {
  alertKey: string;
  triggered: boolean;
  /** True when the underlying data fetch failed — all dedup transitions are skipped. */
  dataUnavailable: boolean;
  valueSnapshot: string;
  payload: AlertPayload;
}

async function checkEthLow(ethBalance: number): Promise<ConditionResult> {
  const triggered = ethBalance < ETH_LOW_THRESHOLD;
  return {
    alertKey: 'eth_low',
    triggered,
    dataUnavailable: false,
    valueSnapshot: `${ethBalance.toFixed(6)} ETH`,
    payload: {
      alertKey: 'eth_low',
      title: 'Deployer ETH Low — Gas Reserve Warning',
      summary: `The deployer EOA (${DEPLOYER_EOA}) ETH balance has dropped below the ${ETH_LOW_THRESHOLD} ETH threshold. Transactions may fail due to insufficient gas. Top up immediately.`,
      severity: 'warning',
      details: [
        { label: 'Current Balance', value: `${ethBalance.toFixed(6)} ETH` },
        { label: 'Threshold', value: `${ETH_LOW_THRESHOLD} ETH` },
        { label: 'Deployer EOA', value: DEPLOYER_EOA },
        { label: 'Network', value: 'Arbitrum One' },
        { label: 'Detected At', value: new Date().toISOString() },
      ],
    },
  };
}

async function checkAxauDepleted(bufferCapacity: string | null): Promise<ConditionResult> {
  // null means the vault fetch failed — treat as UNKNOWN, not as "not depleted".
  // Returning dataUnavailable=true prevents the runner from clearing an active
  // alert just because a transient RPC failure returned no data.
  const dataUnavailable = bufferCapacity === null;
  const triggered = bufferCapacity === 'DEPLETED';
  return {
    alertKey: 'axau_depleted',
    triggered,
    dataUnavailable,
    valueSnapshot: bufferCapacity ?? 'UNKNOWN',
    payload: {
      alertKey: 'axau_depleted',
      title: 'AXAU Buffer DEPLETED — Fulfillment At Risk',
      summary: `The AXAU deployer fulfillment buffer is fully depleted. Pending AXAU purchase orders cannot be fulfilled until the buffer is replenished via PATH A (transfer) or PATH B (PAXG → AXAU mint). Open the Reserves tab to trigger a mint.`,
      severity: 'critical',
      details: [
        { label: 'Buffer Status', value: 'DEPLETED' },
        { label: 'Deployer EOA', value: DEPLOYER_EOA },
        { label: 'Action Required', value: 'Trigger Mint from PAXG (PATH B) or transfer AXAU (PATH A)' },
        { label: 'Console', value: buildDashboardUrl() },
        { label: 'Detected At', value: new Date().toISOString() },
      ],
    },
  };
}

// ── Public runner ──────────────────────────────────────────────────────────
export interface ReserveAlertRunResult {
  checkedAt: string;
  ethBalance: number | null;
  axauBufferCapacity: string | null;
  conditions: Array<{
    alertKey: string;
    triggered: boolean;
    wasActive: boolean;
    action: 'sent' | 'cleared' | 'no_change';
    channelsPaged: string[];
    errors: string[];
    skipped: boolean;
    dataUnavailable: boolean;
  }>;
  totalAlertsSent: number;
  totalAlertsCleared: number;
}

export async function runReserveAlerts(): Promise<ReserveAlertRunResult> {
  const checkedAt = new Date().toISOString();

  // ── 1. Fetch live reserve data (in-process, no HTTP self-call) ───────────
  const ALCHEMY_KEY  = process.env.ALCHEMY_API_KEY ?? '';
  const ARBITRUM_RPC = ALCHEMY_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : 'https://arb1.arbitrum.io/rpc';

  let ethBalance: number | null = null;
  let axauBufferCapacity: string | null = null;

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const [ethRaw, vault] = await Promise.all([
      provider.getBalance(DEPLOYER_EOA).catch(() => null),
      getVaultBuffer().catch(() => null),
    ]);
    if (ethRaw !== null) {
      ethBalance = parseFloat(ethers.formatEther(ethRaw as bigint));
    }
    if (vault) {
      axauBufferCapacity = vault.bufferCapacity ?? null;
    }
  } catch (e) {
    console.error(`${LOG} data fetch failed`, e);
  }

  // ── 3. Evaluate conditions & fire/clear alerts ───────────────────────────
  const emailConfigured   = readEmailRecipients().length > 0;
  const discordConfigured = !!readDiscordWebhook();
  const anyChannelConfigured = emailConfigured || discordConfigured;

  const conditions: ReserveAlertRunResult['conditions'] = [];
  let totalAlertsSent    = 0;
  let totalAlertsCleared = 0;

  const conditionChecks: ConditionResult[] = [];

  if (ethBalance !== null) {
    conditionChecks.push(await checkEthLow(ethBalance));
  }
  conditionChecks.push(await checkAxauDepleted(axauBufferCapacity));

  for (const cond of conditionChecks) {
    let wasActive = false;
    let action: 'sent' | 'cleared' | 'no_change' = 'no_change';
    let channelsPaged: string[] = [];
    let errors: string[] = [];
    let skipped = false;

    if (!process.env.DATABASE_URL) {
      // No DB — skip deduplication, still fire if channels configured
      wasActive = false;
      if (cond.triggered && anyChannelConfigured) {
        const result = await fanOut(cond.payload);
        channelsPaged = result.channelsPaged;
        errors = result.errors;
        action = 'sent';
        totalAlertsSent++;
      }
      conditions.push({ alertKey: cond.alertKey, triggered: cond.triggered, wasActive, action, channelsPaged, errors, skipped, dataUnavailable: cond.dataUnavailable });
      continue;
    }

    try {
      const row = await getOrCreateRow(cond.alertKey);
      wasActive = row.condition_active;

      if (cond.dataUnavailable) {
        // Data fetch failed — skip all dedup transitions to avoid falsely
        // clearing an active alert when the underlying service is temporarily
        // unavailable. Next cron run will re-evaluate once data is available.
        action = 'no_change';
        console.warn(`${LOG} data unavailable for ${cond.alertKey}; skipping dedup transition`);
      } else if (cond.triggered && !wasActive) {
        // New trigger: fire alert
        if (anyChannelConfigured) {
          const result = await fanOut(cond.payload);
          channelsPaged = result.channelsPaged;
          errors = result.errors;
          if (channelsPaged.length > 0) {
            // Only advance dedup state when at least one channel succeeded.
            // If all channels failed, keep condition_active = false so the
            // next cron run retries notification rather than silently suppressing it.
            await markActive(cond.alertKey, cond.valueSnapshot, channelsPaged.join(','));
            action = 'sent';
            totalAlertsSent++;
          } else {
            // All channels failed — log and leave state inactive so we retry
            console.error(`${LOG} all notification channels failed for ${cond.alertKey}; will retry on next run. Errors: ${errors.join('; ')}`);
            action = 'no_change';
          }
        } else {
          skipped = true;
          action = 'no_change';
          console.warn(`${LOG} condition ${cond.alertKey} triggered but no notification channels configured`);
        }
      } else if (!cond.triggered && wasActive) {
        // Condition confirmed clear with fresh data: reset so future re-trigger fires fresh alert
        await markCleared(cond.alertKey);
        action = 'cleared';
        totalAlertsCleared++;
      } else {
        action = 'no_change';
      }
    } catch (e) {
      console.error(`${LOG} DB error for ${cond.alertKey}`, e);
      errors.push(`db: ${(e as Error).message}`);
    }

    conditions.push({ alertKey: cond.alertKey, triggered: cond.triggered, wasActive, action, channelsPaged, errors, skipped, dataUnavailable: cond.dataUnavailable });
  }

  return { checkedAt, ethBalance, axauBufferCapacity, conditions, totalAlertsSent, totalAlertsCleared };
}
