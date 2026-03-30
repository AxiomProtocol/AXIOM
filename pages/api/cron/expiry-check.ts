import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { t3Claims, t3Identities, t3ComplianceOpsLog, CLAIM_REFRESH_WARNING_DAYS } from '../../../shared/erc3643Schema';
import { and, lte, eq } from 'drizzle-orm';
import { DEPLOYER_EOA } from '../../../src/config/adminRoles';
import { Resend } from 'resend';

const TOPIC_NAMES: Record<number, string> = {
  1: 'KYC_VERIFIED',
  2: 'ACCREDITED_INVESTOR',
  3: 'SANCTIONS_CLEAR',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = (req.headers['x-admin-key'] ?? req.headers['authorization'] ?? '') as string;
  if (!key || key !== process.env.ADMIN_SOLVENCY_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const warningCutoff = new Date(now.getTime() + CLAIM_REFRESH_WARNING_DAYS * 24 * 3600 * 1000);

    const results = await db.select({ claim: t3Claims, wallet: t3Identities.wallet })
      .from(t3Claims)
      .innerJoin(t3Identities, eq(t3Claims.identityId, t3Identities.id))
      .where(and(eq(t3Claims.revoked, false), lte(t3Claims.expiresAt, warningCutoff)));

    const alertEntries = results.map((r) => ({
      id: r.claim.id,
      wallet: r.wallet,
      topic: r.claim.topic,
      expiresAt: r.claim.expiresAt,
      daysUntilExpiry: r.claim.expiresAt
        ? Math.max(0, Math.ceil((r.claim.expiresAt.getTime() - now.getTime()) / (24 * 3600 * 1000)))
        : null,
    }));

    let emailSent = false;
    if (alertEntries.length > 0) {
      try {
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          const client = new Resend(resendKey);
          const rows = alertEntries.map((e) =>
            `<tr><td style="padding:4px 8px;font-family:monospace">${e.wallet}</td><td style="padding:4px 8px;font-family:monospace">${TOPIC_NAMES[e.topic] ?? `Topic ${e.topic}`}</td><td style="padding:4px 8px;font-family:monospace">${e.daysUntilExpiry ?? '—'}</td><td style="padding:4px 8px;font-family:monospace">${e.expiresAt?.toISOString().slice(0, 10) ?? '—'}</td></tr>`
          ).join('');
          const html = `<h2>AXUSD Compliance — Daily Expiry Check</h2><p>${alertEntries.length} claim(s) expiring within ${CLAIM_REFRESH_WARNING_DAYS} days or already expired.</p><table border="1" cellpadding="0" cellspacing="0"><thead><tr><th>Wallet</th><th>Topic</th><th>Days Remaining</th><th>Expires</th></tr></thead><tbody>${rows}</tbody></table>`;
          const toEmail = process.env.COMPLIANCE_ALERT_EMAIL ?? 'compliance@axiom.money';
          await client.emails.send({ from: 'compliance@axiom.money', to: [toEmail], subject: `[Axiom Compliance] ${alertEntries.length} claim(s) expiring — ${now.toISOString().slice(0, 10)}`, html });
          emailSent = true;
        }
      } catch (emailErr) {
        console.error('[cron/expiry-check] email failed:', emailErr);
      }

      await db.insert(t3ComplianceOpsLog).values({
        wallet: 'system',
        action: 'expiry_alert',
        operatorAddress: DEPLOYER_EOA.toLowerCase(),
        result: emailSent ? 'success' : 'partial',
        notes: `Daily expiry scan: ${alertEntries.length} claim(s) within ${CLAIM_REFRESH_WARNING_DAYS}d. Email sent: ${emailSent}`,
        metadata: { count: alertEntries.length, wallets: alertEntries.map((e) => e.wallet), scheduledAt: now.toISOString() },
      }).catch((e) => console.error('[cron/expiry-check] log insert failed:', e));
    }

    return res.status(200).json({
      success: true,
      ran: now.toISOString(),
      expiring: alertEntries.length,
      emailSent,
      schedule: '0 8 * * * (daily 08:00 UTC via Vercel Cron)',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
