/**
 * POST /api/banking/dao-account/apply
 *
 * Accepts a DAO operating account application.
 * Stores entity + BSA fields in dao_account_applications with status pending_review.
 * Sends internal notification email via Resend (non-fatal on failure).
 * BSA fields are stored but stripped from all API responses.
 *
 * Rate limited: 3 applications per IP per hour.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { daoAccountApplications } from '../../../../shared/daoAccountSchema';
import { checkRateLimit } from '../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { Resend } from 'resend';

const VALID_ID_TYPES = ['passport', 'drivers_license', 'national_id', 'state_id'];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function getResendCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;
  if (!xReplitToken) throw new Error('No Replit token');
  const settings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    { headers: { Accept: 'application/json', X_REPLIT_TOKEN: xReplitToken } }
  ).then(r => r.json()).then(d => d.items?.[0]);
  if (!settings?.settings?.api_key) throw new Error('Resend not connected');
  return { apiKey: settings.settings.api_key, fromEmail: settings.settings.from_email };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkRateLimit(req, res, 'dao-account/apply', { max: 3, windowMs: 3_600_000 })) return;

  const {
    entityName,
    entityEin,
    entityAddress,
    signerName,
    signerDob,
    signerCountry,
    signerIdType,
    signerIdNumber,
  } = req.body as {
    entityName?: string;
    entityEin?: string;
    entityAddress?: string;
    signerName?: string;
    signerDob?: string;
    signerCountry?: string;
    signerIdType?: string;
    signerIdNumber?: string;
  };

  if (!entityName?.trim()) return res.status(400).json({ error: 'entityName is required' });
  if (!entityEin?.trim()) return res.status(400).json({ error: 'entityEin is required' });
  const einClean = entityEin.replace(/\D/g, '');
  if (einClean.length !== 9) return res.status(400).json({ error: 'entityEin must be 9 digits (e.g. 12-3456789)' });
  if (!entityAddress?.trim()) return res.status(400).json({ error: 'entityAddress is required' });
  if (!signerName?.trim()) return res.status(400).json({ error: 'signerName is required' });
  if (!signerDob?.trim()) return res.status(400).json({ error: 'signerDob is required (YYYY-MM-DD)' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(signerDob.trim())) return res.status(400).json({ error: 'signerDob must be YYYY-MM-DD' });
  if (!signerCountry?.trim() || signerCountry.trim().length !== 3) {
    return res.status(400).json({ error: 'signerCountry must be a 3-letter ISO country code (e.g. USA)' });
  }
  if (!signerIdType?.trim() || !VALID_ID_TYPES.includes(signerIdType.trim().toLowerCase())) {
    return res.status(400).json({ error: `signerIdType must be one of: ${VALID_ID_TYPES.join(', ')}` });
  }
  if (!signerIdNumber?.trim()) return res.status(400).json({ error: 'signerIdNumber is required' });

  try {
    const [record] = await db.insert(daoAccountApplications).values({
      entityName: entityName.trim(),
      entityEin: einClean,
      entityAddress: entityAddress.trim(),
      signerName: signerName.trim(),
      signerDob: signerDob.trim(),
      signerCountry: signerCountry.trim().toUpperCase(),
      signerIdType: signerIdType.trim().toLowerCase(),
      signerIdNumber: signerIdNumber.trim(),
      status: 'pending_review',
    }).returning({
      id: daoAccountApplications.id,
      status: daoAccountApplications.status,
      entityName: daoAccountApplications.entityName,
      createdAt: daoAccountApplications.createdAt,
    });

    try {
      const { apiKey, fromEmail } = await getResendCredentials();
      const client = new Resend(apiKey);
      await client.emails.send({
        from: fromEmail || 'Axiom Ops <noreply@axiom.money>',
        to: ['info@axiomprotocol.app'],
        subject: `[DAO Account Application] ${escapeHtml(entityName.trim())}`,
        html: `
<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1B2A4A;">
  <div style="border-bottom: 2px solid #1B2A4A; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="margin: 0; font-size: 22px; letter-spacing: 2px;">AXIOM PROTOCOL</h1>
    <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280; font-family: monospace;">DAO Operating Account — New Application</p>
  </div>
  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <tr><td style="padding: 8px 0; color: #6b7280; font-family: monospace; width: 160px;">Application ID</td><td style="padding: 8px 0; font-family: monospace;">${record.id}</td></tr>
    <tr><td style="padding: 8px 0; color: #6b7280; font-family: monospace;">Entity Name</td><td style="padding: 8px 0; font-weight: bold;">${escapeHtml(entityName.trim())}</td></tr>
    <tr><td style="padding: 8px 0; color: #6b7280; font-family: monospace;">EIN</td><td style="padding: 8px 0; font-family: monospace;">${einClean.slice(0, 2)}-${einClean.slice(2)}***</td></tr>
    <tr><td style="padding: 8px 0; color: #6b7280; font-family: monospace;">Submitted</td><td style="padding: 8px 0; font-family: monospace;">${new Date().toISOString()}</td></tr>
  </table>
  <div style="margin-top: 24px; padding: 12px 16px; border: 1px solid #B8973A; background: #FEF9E7;">
    <p style="margin: 0; font-family: monospace; font-size: 12px; color: #92400E;">Review in Founder Ops → DAO Accounts tab. BSA fields stored in database, not shown here.</p>
  </div>
</div>`.trim(),
      });
    } catch (emailErr) {
      console.error('[DAO Account Apply] Email send failed (non-fatal):', emailErr);
    }

    return res.status(201).json({
      success: true,
      data: {
        id: record.id,
        status: record.status,
        entityName: record.entityName,
        createdAt: record.createdAt,
        message: 'Application received. Axiom Ops will review and provision your account within 2–3 business days.',
      },
    });
  } catch (err: unknown) {
    console.error('[DAO Account Apply] Error:', err);
    return res.status(500).json({ error: 'Failed to submit application. Please try again.' });
  }
}
