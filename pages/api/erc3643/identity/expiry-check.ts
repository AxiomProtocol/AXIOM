import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { t3Claims, t3Identities, t3ComplianceOpsLog, CLAIM_VALIDITY_DAYS, CLAIM_REFRESH_WARNING_DAYS } from '../../../../shared/erc3643Schema';
import { eq, and, lte, gte } from 'drizzle-orm';

const TOPIC_NAMES: Record<number, string> = {
  1: 'KYC_VERIFIED',
  2: 'ACCREDITED_INVESTOR',
  3: 'SANCTIONS_CLEAR',
};

function getExpiryStatus(expiresAt: Date | null): 'valid' | 'expiring_soon' | 'expired' {
  if (!expiresAt) return 'valid';
  const now = new Date();
  if (expiresAt <= now) return 'expired';
  const warningDate = new Date(now.getTime() + CLAIM_REFRESH_WARNING_DAYS * 24 * 3600 * 1000);
  if (expiresAt <= warningDate) return 'expiring_soon';
  return 'valid';
}

async function sendExpiryAlertEmail(entries: { wallet: string; topic: number; daysRemaining: number | null; expiresAt: Date | null }[]) {
  try {
    const { Resend } = await import('resend');
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY
      ? 'repl ' + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

    if (!xReplitToken || !hostname) throw new Error('Resend credentials unavailable');

    const connData = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      { headers: { Accept: 'application/json', X_REPLIT_TOKEN: xReplitToken } }
    ).then(r => r.json()).then(d => d.items?.[0]);

    if (!connData?.settings?.api_key) throw new Error('Resend not connected');

    const client = new Resend(connData.settings.api_key);
    const fromEmail = connData.settings.from_email ?? 'compliance@axiom.money';
    const toEmail = process.env.COMPLIANCE_ALERT_EMAIL ?? fromEmail;

    const rows = entries.map(e =>
      `<tr><td style="padding:4px 8px;font-family:monospace">${e.wallet}</td><td style="padding:4px 8px;font-family:monospace">${TOPIC_NAMES[e.topic] ?? `Topic ${e.topic}`}</td><td style="padding:4px 8px;font-family:monospace">${e.daysRemaining ?? '—'}</td><td style="padding:4px 8px;font-family:monospace">${e.expiresAt?.toISOString().slice(0, 10) ?? '—'}</td></tr>`
    ).join('');

    const html = `<h2>AXUSD Compliance — Claim Expiry Alert</h2><p>${entries.length} claim(s) expire within ${CLAIM_REFRESH_WARNING_DAYS} days or are already expired.</p><table border="1" cellpadding="0" cellspacing="0"><thead><tr><th>Wallet</th><th>Claim Topic</th><th>Days Remaining</th><th>Expires</th></tr></thead><tbody>${rows}</tbody></table><p>Action required: renew or revoke these claims from the Compliance Queue in Founder Ops.</p>`;

    await client.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: `[Axiom Compliance] ${entries.length} claim(s) expiring soon`,
      html,
    });

    return true;
  } catch (err) {
    console.error('[expiry-check] Email alert failed:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function runExpiryJob() {
  const now = new Date();
  const warningCutoff = new Date(now.getTime() + CLAIM_REFRESH_WARNING_DAYS * 24 * 3600 * 1000);

  const results = await db.select({ claim: t3Claims, wallet: t3Identities.wallet })
    .from(t3Claims)
    .innerJoin(t3Identities, eq(t3Claims.identityId, t3Identities.id))
    .where(and(eq(t3Claims.revoked, false), lte(t3Claims.expiresAt, warningCutoff)));

  const entries = results.map(r => ({
    wallet: r.wallet,
    topic: r.claim.topic,
    expiresAt: r.claim.expiresAt,
    daysRemaining: r.claim.expiresAt
      ? Math.max(0, Math.ceil((r.claim.expiresAt.getTime() - now.getTime()) / (24 * 3600 * 1000)))
      : null,
  }));

  let emailSent = false;
  if (entries.length > 0) {
    emailSent = await sendExpiryAlertEmail(entries);
    await db.insert(t3ComplianceOpsLog).values({
      wallet: 'system',
      action: 'expiry_alert',
      notes: `${entries.length} claim(s) expiring within ${CLAIM_REFRESH_WARNING_DAYS} days. Email sent: ${emailSent}`,
      result: emailSent ? 'success' : 'partial',
      metadata: { count: entries.length, wallets: entries.map(e => e.wallet) },
    }).catch(() => {});
  }

  return { checked: results.length, alertsSent: entries.length, emailSent, entries };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const wallet = req.query.wallet as string | undefined;
  const authHeader = req.headers['authorization'] as string | undefined;
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (req.method === 'GET') {
    if (isVercelCron) {
      try {
        return res.status(200).json({ success: true, data: await runExpiryJob() });
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    }

    try {
      let query;
      if (wallet && /^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        query = db.select({ claim: t3Claims, wallet: t3Identities.wallet })
          .from(t3Claims)
          .innerJoin(t3Identities, eq(t3Claims.identityId, t3Identities.id))
          .where(and(eq(t3Identities.wallet, wallet.toLowerCase()), eq(t3Claims.revoked, false)));
      } else {
        query = db.select({ claim: t3Claims, wallet: t3Identities.wallet })
          .from(t3Claims)
          .innerJoin(t3Identities, eq(t3Claims.identityId, t3Identities.id))
          .where(eq(t3Claims.revoked, false));
      }

      const results = await query;
      const claims = results.map(r => {
        const status = getExpiryStatus(r.claim.expiresAt);
        return {
          id: r.claim.id,
          wallet: r.wallet,
          topic: r.claim.topic,
          topicName: TOPIC_NAMES[r.claim.topic] || `TOPIC_${r.claim.topic}`,
          validFrom: r.claim.validFrom,
          expiresAt: r.claim.expiresAt,
          refreshRequiredBy: r.claim.refreshRequiredBy,
          validityDays: CLAIM_VALIDITY_DAYS[r.claim.topic] || 365,
          expiryStatus: status,
          daysRemaining: r.claim.expiresAt
            ? Math.max(0, Math.ceil((r.claim.expiresAt.getTime() - Date.now()) / (24 * 3600 * 1000)))
            : null,
        };
      });

      const expiring = claims.filter(c => c.expiryStatus === 'expiring_soon');
      const expired = claims.filter(c => c.expiryStatus === 'expired');
      const valid = claims.filter(c => c.expiryStatus === 'valid');

      return res.status(200).json({
        success: true,
        data: {
          summary: { total: claims.length, valid: valid.length, expiringSoon: expiring.length, expired: expired.length },
          claims, expiring, expired,
        },
      });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (req.method === 'POST') {
    const adminKey = req.headers['x-admin-key'] as string | undefined;
    const isAdminKey = adminKey && adminKey === process.env.ADMIN_SOLVENCY_KEY;
    if (!isVercelCron && !isAdminKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      return res.status(200).json({ success: true, data: await runExpiryJob() });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
