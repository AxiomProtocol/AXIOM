import type { NextApiRequest, NextApiResponse } from 'next';
import { createCheckoutSession, type CardDepositIntent } from '../../../../../lib/capinfra/cardDeposits/service';
import { randomUUID } from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({
      error: 'card_onramp_not_configured',
      message: 'Card onramp is not yet configured. STRIPE_SECRET_KEY is missing.',
    });
  }

  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const amountCents = Number(body.amountCents);
    const intent = (body.intent ?? 'TREASURY_FUND') as CardDepositIntent;
    const userId = typeof body.userId === 'string' ? body.userId : null;
    const buyerEmail = typeof body.buyerEmail === 'string' ? body.buyerEmail : null;
    const targetWalletAddress = typeof body.targetWalletAddress === 'string' ? body.targetWalletAddress : null;
    const idempotencyKey = typeof body.idempotencyKey === 'string' && body.idempotencyKey.length >= 8
      ? body.idempotencyKey
      : `cd-${randomUUID()}`;

    const host = req.headers.host || 'localhost:5000';
    const protocol = host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const result = await createCheckoutSession({
      amountCents,
      intent,
      userId,
      buyerEmail,
      targetWalletAddress,
      idempotencyKey,
      baseUrl,
    });

    return res.status(201).json({
      depositId: result.deposit.id,
      sessionId: result.sessionId,
      checkoutUrl: result.checkoutUrl,
      status: result.deposit.status,
      idempotencyKey,
    });
  } catch (err: any) {
    const msg = err?.message ?? 'unknown error';
    const isClient = /required|must be|invalid|reused/i.test(msg);
    return res.status(isClient ? 400 : 500).json({
      error: isClient ? 'invalid_request' : 'checkout_create_failed',
      message: msg,
    });
  }
}
