import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '@/src/config/adminRoles';
import { createCheckoutSession } from '@/lib/capinfra/cardDeposits/service';

const FOUNDER_USER_ID = 'operator_founder';
const MIN_CENTS = 2500;    // $25.00
const MAX_CENTS = 250000;  // $2,500.00

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const body = (req.body ?? {}) as { amount_cents?: unknown; idempotency_key?: unknown };
    const amountCents = Number(body.amount_cents);
    if (!Number.isInteger(amountCents) || amountCents < MIN_CENTS || amountCents > MAX_CENTS) {
      return res.status(400).json({
        success: false,
        error: `amount_cents must be an integer between ${MIN_CENTS} ($${MIN_CENTS / 100}) and ${MAX_CENTS} ($${MAX_CENTS / 100})`,
      });
    }
    const idempotencyKey = String(body.idempotency_key ?? `wallet-topup-${FOUNDER_USER_ID}-${Date.now()}`);
    const proto = req.headers['x-forwarded-proto'] ?? 'https';
    const host  = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost:5000';
    const baseUrl = `${proto}://${host}`;

    const result = await createCheckoutSession({
      amountCents,
      intent: 'WALLET_TOPUP',
      userId: FOUNDER_USER_ID,
      idempotencyKey,
      baseUrl,
      successPath: '/founder-ops?tab=reserves&wallet_funded=1',
      cancelPath:  '/founder-ops?tab=reserves&wallet_cancelled=1',
    });

    return res.status(200).json({
      success: true,
      checkout_url: result.checkoutUrl,
      session_id: result.sessionId,
      deposit_id: result.deposit.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Checkout creation failed';
    console.error('[wallet/topup/checkout]', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
