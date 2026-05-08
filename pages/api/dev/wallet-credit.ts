/**
 * POST /api/dev/wallet-credit
 *
 * DEV-ONLY — blocked entirely in production.
 * Directly credits the internal wallet using the same creditTopUp path
 * that Stripe webhooks use, which fires the AI auto-allocation side-effect.
 *
 * Body: { amount_cents: number }
 * Header: x-admin-key
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '@/src/config/adminRoles';
import { creditTopUp } from '@/lib/wallet/service';

const FOUNDER_USER_ID = 'operator_founder';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const body = req.body as Record<string, unknown> | null | undefined;
  const raw = body?.amount_cents;
  if (!raw || !Number.isInteger(Number(raw)) || Number(raw) <= 0) {
    return res.status(400).json({ success: false, error: 'amount_cents must be a positive integer' });
  }

  const amountCents = Number(raw);
  const idempotencyKey = `dev_sync_${amountCents}_${Date.now()}`;

  try {
    const txn = await creditTopUp({
      userId: FOUNDER_USER_ID,
      amountCents,
      referenceId: idempotencyKey,
      idempotencyKey,
      notes: `DEV sync from production ($${(amountCents / 100).toFixed(2)})`,
    });

    return res.status(200).json({
      success: true,
      txn_id: txn.id,
      amount_usd: amountCents / 100,
      balance_after_usd: txn.balanceAfterCents / 100,
      note: 'AI auto-allocation will fire in the background — check /api/capinfra/operator/last-auto-alloc in ~10s',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[dev/wallet-credit]', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
