import type { NextApiRequest, NextApiResponse } from 'next';
import { createCheckoutSession, type CardDepositIntent } from '../../../../../lib/capinfra/cardDeposits/service';
import {
  StripeAccountMismatchError,
  StripeNotConfiguredError,
  LegacyStripeAccountError,
} from '../../../../../lib/stripe/client';
import { isValidOperatorKey, readOperatorCookie, OPERATOR_HEADER_KEY } from '../../../../../lib/capinfra/operatorAuth';

/**
 * Treasury card-deposit checkout.
 *
 * OPERATOR-ONLY. Re-enabled in task #402 after the Stripe account cutover
 * (task #398) and provenance tagging (task #400) shipped. The service
 * layer at `lib/capinfra/cardDeposits/service.ts` handles:
 *   - account-id pin enforcement via `getStripe()` (fails loud on key mismatch)
 *   - `stripe_account_id` provenance stamping at insert time
 *   - idempotency on `idempotencyKey` with race-safe ON CONFLICT DO NOTHING
 *   - on-resume `assertCurrentStripeAccount` to refuse cross-account replays
 *
 * Consumer card payments still route through `/onramp` (Coinbase). This
 * endpoint exists to fund the treasury (TREASURY_FUND) or to mint AXUSD/AXAU
 * directly to a wallet (AXUSD_MINT, AXAU_MINT) under operator control.
 */

interface ParsedBody {
  amountCents: number;
  intent: CardDepositIntent;
  idempotencyKey: string;
  userId: string | null;
  buyerEmail: string | null;
  targetWalletAddress: string | null;
}

function parseBody(body: unknown): ParsedBody | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'request body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;

  const amountCents = Number(b.amountCents);
  if (!Number.isInteger(amountCents)) {
    return { error: 'amountCents must be an integer (whole cents)' };
  }

  const intent = b.intent;
  if (intent !== 'TREASURY_FUND' && intent !== 'AXUSD_MINT' && intent !== 'AXAU_MINT') {
    return { error: 'intent must be one of TREASURY_FUND, AXUSD_MINT, AXAU_MINT' };
  }

  const idempotencyKey = typeof b.idempotencyKey === 'string' ? b.idempotencyKey : '';
  if (!idempotencyKey) return { error: 'idempotencyKey is required' };

  const userId = typeof b.userId === 'string' && b.userId ? b.userId : null;
  const buyerEmail = typeof b.buyerEmail === 'string' && b.buyerEmail ? b.buyerEmail : null;
  const targetWalletAddress =
    typeof b.targetWalletAddress === 'string' && b.targetWalletAddress
      ? b.targetWalletAddress
      : null;

  return { amountCents, intent, idempotencyKey, userId, buyerEmail, targetWalletAddress };
}

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

  // Operator auth: accept either the operator cookie (browser flow from
  // /operator/treasury/card-deposits) or the x-admin-key header (scripts).
  const headerKey = req.headers[OPERATOR_HEADER_KEY];
  const providedKey = (typeof headerKey === 'string' ? headerKey : null) ?? readOperatorCookie(req);
  if (!isValidOperatorKey(providedKey)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const parsed = parseBody(req.body);
  if ('error' in parsed) {
    return res.status(400).json({ error: 'invalid_body', message: parsed.error });
  }

  try {
    const result = await createCheckoutSession({
      amountCents: parsed.amountCents,
      intent: parsed.intent,
      idempotencyKey: parsed.idempotencyKey,
      userId: parsed.userId,
      buyerEmail: parsed.buyerEmail,
      targetWalletAddress: parsed.targetWalletAddress,
      baseUrl: resolveBaseUrl(req),
    });
    return res.status(200).json({
      depositId: result.deposit.id,
      sessionId: result.sessionId,
      checkoutUrl: result.checkoutUrl,
      status: result.deposit.status,
      stripeAccountId: result.deposit.stripeAccountId,
    });
  } catch (err) {
    if (err instanceof StripeAccountMismatchError) {
      console.error('[card-deposit/checkout] account mismatch:', err.message);
      return res.status(503).json({
        error: 'stripe_account_mismatch',
        expected: err.expectedAccountId,
        actual: err.actualAccountId,
      });
    }
    if (err instanceof LegacyStripeAccountError) {
      console.error('[card-deposit/checkout] legacy account row:', err.message);
      return res.status(409).json({
        error: 'legacy_stripe_account',
        rowAccountId: err.rowAccountId,
        currentAccountId: err.currentAccountId,
      });
    }
    if (err instanceof StripeNotConfiguredError) {
      return res.status(503).json({ error: 'stripe_not_configured' });
    }
    const msg = err instanceof Error ? err.message : 'unknown error';
    // The service layer pre-checks `process.env.STRIPE_SECRET_KEY` and
    // throws a plain Error before `getStripe()` would itself throw the
    // typed `StripeNotConfiguredError`. Map by message so the operator
    // gets the same 503 either way.
    if (msg === 'STRIPE_SECRET_KEY not configured') {
      return res.status(503).json({ error: 'stripe_not_configured' });
    }
    // Validation errors from the service layer are operator input issues,
    // not server faults. The service throws plain Error for these.
    if (
      msg.includes('amountCents') ||
      msg.includes('intent') ||
      msg.includes('idempotencyKey') ||
      msg.includes('targetWalletAddress') ||
      msg.includes('Idempotency key reused')
    ) {
      return res.status(400).json({ error: 'invalid_request', message: msg });
    }
    console.error('[card-deposit/checkout] unexpected error:', msg, err);
    return res.status(500).json({ error: 'checkout_failed', message: msg });
  }
}
