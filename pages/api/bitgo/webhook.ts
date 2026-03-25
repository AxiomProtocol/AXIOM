import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { db } from '../../../lib/db';
import { bitgoWebhooks } from '../../../shared/bitgoSchema';
import { bridgeService } from '../../../lib/services/BridgeService';

export const config = { api: { bodyParser: true } };

function verifySignature(bodyStr: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.BITGO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[BitGo webhook] BITGO_WEBHOOK_SECRET is not configured — rejecting all inbound webhook calls');
    return res.status(503).json({ error: 'Webhook validation not configured' });
  }

  const signature = (req.headers['x-bitgo-signature'] as string) ?? '';
  if (!signature) {
    return res.status(401).json({ error: 'Missing x-bitgo-signature header' });
  }

  const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  if (!verifySignature(bodyStr, signature, webhookSecret)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const event = req.body as {
    type?: string;
    walletId?: string;
    transfer?: { id?: string; state?: string; txid?: string };
    hash?: string;
  };

  const eventType = event?.type ?? 'unknown';
  const walletId = event?.walletId ?? null;

  try {
    await db
      .insert(bitgoWebhooks)
      .values({
        bitgoWalletId: walletId ?? undefined,
        eventType,
        payload: event as Record<string, unknown>,
        processedAt: new Date(),
      })
      .onConflictDoNothing();
  } catch {
  }

  if (eventType === 'transfer' && event?.transfer?.state === 'confirmed') {
    console.log('[BitGo webhook] Transfer confirmed:', event.transfer.id);
  }

  return res.status(200).json({ received: true });
}