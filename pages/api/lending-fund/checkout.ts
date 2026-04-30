/**
 * /api/lending-fund/checkout
 *
 * Public consumer endpoint — creates a Stripe Checkout session for
 * LP capital intake on the Lending Fund. On payment success, the
 * existing card-deposit webhook mints AXUSD 1:1 to the investor's
 * wallet (AXUSD_MINT intent) so they can complete the on-chain deposit.
 *
 * No operator auth required; wallet address is required so AXUSD
 * can be minted to the correct destination on success.
 *
 * The stripe webhook is the shared endpoint at:
 *   /api/capinfra/treasury/card-deposit/webhook
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createCheckoutSession } from '../../../lib/capinfra/cardDeposits/service';
import {
  StripeAccountMismatchError,
  StripeNotConfiguredError,
  LegacyStripeAccountError,
} from '../../../lib/stripe/client';
import { randomUUID } from 'crypto';

const MIN_USD = 100;
const MAX_USD = 10_000;

function resolveBaseUrl(req: NextApiRequest): string {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (envBase) return envBase.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) || 'https';
  const host = req.headers.host || 'localhost:5000';
  return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const body = req.body as Record<string, unknown>;

  const amountUsd = Number(body.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd < MIN_USD || amountUsd > MAX_USD) {
    return res.status(400).json({
      error: 'invalid_amount',
      message: `amountUsd must be between ${MIN_USD} and ${MAX_USD}`,
    });
  }

  const walletAddress =
    typeof body.walletAddress === 'string' && /^0x[0-9a-fA-F]{40}$/.test(body.walletAddress)
      ? body.walletAddress
      : null;
  if (!walletAddress) {
    return res.status(400).json({ error: 'missing_wallet', message: 'walletAddress is required (0x…)' });
  }

  const buyerEmail = typeof body.email === 'string' && body.email ? body.email : null;

  const amountCents = Math.round(amountUsd * 100);
  const idempotencyKey = `lf-capital-${walletAddress.toLowerCase()}-${amountCents}-${randomUUID()}`;
  const baseUrl = resolveBaseUrl(req);

  try {
    const result = await createCheckoutSession({
      amountCents,
      intent: 'AXUSD_MINT',
      userId: null,
      buyerEmail,
      targetWalletAddress: walletAddress,
      idempotencyKey,
      baseUrl,
    });
    return res.status(200).json({
      depositId: result.deposit.id,
      sessionId: result.sessionId,
      checkoutUrl: result.checkoutUrl,
    });
  } catch (err) {
    if (err instanceof StripeAccountMismatchError) {
      return res.status(503).json({ error: 'stripe_account_mismatch' });
    }
    if (err instanceof LegacyStripeAccountError) {
      return res.status(409).json({ error: 'legacy_stripe_account' });
    }
    if (err instanceof StripeNotConfiguredError) {
      return res.status(503).json({ error: 'stripe_not_configured' });
    }
    const msg = err instanceof Error ? err.message : 'unknown error';
    if (msg === 'STRIPE_SECRET_KEY not configured') {
      return res.status(503).json({ error: 'stripe_not_configured' });
    }
    console.error('[lending-fund/checkout] error:', msg);
    return res.status(500).json({ error: 'checkout_failed', message: msg });
  }
}
