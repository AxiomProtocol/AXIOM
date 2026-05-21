import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { pool } from '../../../server/db';
import { addAuditEntry } from '../../../lib/compliance';

export const config = { api: { bodyParser: false } };

function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifyPersonaSignature(rawBody: Buffer, signatureHeader: string, secret: string): boolean {
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [k, v] = part.split('=');
      return [k.trim(), v.trim()];
    })
  );

  const timestamp = parts['t'];
  const receivedSig = parts['v1'];

  if (!timestamp || !receivedSig) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
  if (ageSeconds > 300) return false;

  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(receivedSig, 'hex'), Buffer.from(expected, 'hex'));
}

const STATUS_MAP: Record<string, string> = {
  'inquiry.approved': 'approved',
  'inquiry.declined': 'rejected',
  'inquiry.needs_review': 'under_review',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.PERSONA_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Persona Webhook] PERSONA_WEBHOOK_SECRET is not configured');
    return res.status(503).json({ error: 'Webhook not configured' });
  }

  const signatureHeader = req.headers['persona-signature'] as string | undefined;
  if (!signatureHeader) {
    return res.status(400).json({ error: 'Missing Persona-Signature header' });
  }

  let rawBody: Buffer;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    return res.status(400).json({ error: 'Failed to read request body' });
  }

  if (!verifyPersonaSignature(rawBody, signatureHeader, webhookSecret)) {
    console.warn('[Persona Webhook] Signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const eventName: string = payload?.data?.type ?? payload?.type ?? '';
  const inquiryId: string = payload?.data?.id ?? payload?.data?.attributes?.id ?? '';
  const referenceId: string =
    payload?.data?.attributes?.['reference-id'] ??
    payload?.data?.relationships?.account?.data?.id ??
    '';

  const newStatus = STATUS_MAP[eventName];
  if (!newStatus) {
    return res.status(200).json({ received: true, skipped: true, reason: `Unhandled event: ${eventName}` });
  }

  if (!inquiryId) {
    console.warn('[Persona Webhook] Missing inquiry ID in payload', payload);
    return res.status(400).json({ error: 'Missing inquiry ID' });
  }

  try {
    const result = await pool.query(
      `UPDATE kyc_verifications
         SET verification_status = $1,
             persona_inquiry_id   = $2,
             reviewed_at          = NOW(),
             updated_at           = NOW()
       WHERE persona_inquiry_id = $2
          OR (user_id = (
                SELECT id FROM users WHERE auth0_id = $3 OR id::text = $3
                LIMIT 1
              ) AND persona_inquiry_id IS NULL)
       RETURNING id, user_id, verification_status`,
      [newStatus, inquiryId, referenceId]
    );

    if (result.rows.length === 0) {
      console.warn(`[Persona Webhook] No matching kyc_verifications row for inquiry ${inquiryId} / ref ${referenceId}`);
      return res.status(200).json({ received: true, matched: false });
    }

    const row = result.rows[0];

    addAuditEntry({
      action: `persona_webhook_${eventName}`,
      actor: 'persona',
      actorType: 'system',
      resource: 'kyc_verification',
      resourceId: String(row.id),
      details: {
        inquiryId,
        referenceId,
        eventName,
        newStatus,
        personaPayloadType: payload?.data?.type,
      },
      ipAddress: req.headers['x-forwarded-for'] as string ?? req.socket.remoteAddress ?? 'unknown',
    });

    console.info(`[Persona Webhook] Updated kyc_verifications id=${row.id} → status=${newStatus} (inquiry=${inquiryId})`);
    return res.status(200).json({ received: true, matched: true, kycId: row.id, status: newStatus });
  } catch (err: any) {
    console.error('[Persona Webhook] DB error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
