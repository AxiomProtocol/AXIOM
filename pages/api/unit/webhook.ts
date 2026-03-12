import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { UNIT_WEBHOOK_SECRET } from '../../../lib/unit/client';
import { bridgeService } from '../../../lib/services/BridgeService';
import { db } from '../../../lib/db';
import { unitWebhookEvents } from '../../../shared/unitSchema';

export const config = { api: { bodyParser: false } };

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  if (!secret) return true;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const signature = (req.headers['x-unit-signature'] as string) ?? '';

  if (UNIT_WEBHOOK_SECRET && !verifySignature(rawBody, signature, UNIT_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  let event: { type?: string; data?: { id?: string; attributes?: Record<string, unknown>; relationships?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const eventType = event?.type ?? 'unknown';
  const eventId = event?.data?.id ?? null;

  try {
    await db.insert(unitWebhookEvents).values({
      unitEventId: String(eventId ?? ''),
      eventType,
      payload: event as Record<string, unknown>,
      processedAt: new Date(),
    }).onConflictDoNothing();
  } catch {
  }

  try {
    if (eventType === 'payment.clearing' || eventType === 'payment.sent') {
      const paymentId = eventId;
      if (paymentId) {
        await bridgeService.markAchSettled(String(paymentId));
      }
    }
  } catch (err) {
    console.error('[Unit webhook] handler error:', err);
  }

  return res.status(200).json({ received: true });
}
