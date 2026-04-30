import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createCardCheckoutSession,
  type PropertyCardTier,
} from '../../../lib/property/cardCheckout';
import {
  StripeAccountMismatchError,
  StripeNotConfiguredError,
} from '../../../lib/stripe/client';

/**
 * Task #403 — Property Analysis report card checkout (consumer-facing).
 *
 * Re-enabled in parallel with the existing on-chain AXUSD path. Buyers
 * without a connected wallet can pay $4.99 (Base) or $14.99 (Premium)
 * with a card via Stripe Checkout. The on-chain path remains the default
 * for buyers who do connect a wallet.
 *
 * Service layer (`lib/property/cardCheckout.ts`):
 *   - account-id pin enforcement via `getStripe()`
 *   - `stripe_account_id` provenance stamping
 *   - one Stripe session per call; abandoned rows are harmless
 *
 * NO operator gate — consumers buy reports.
 */

interface ParsedBody {
  address: string;
  tier: PropertyCardTier;
  sqft: number | null;
  bedrooms: number | null;
  bathrooms: string | null;
  yearBuilt: number | null;
  propertyType: string | null;
  buyerEmail: string | null;
}

function parseIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function parseBody(body: unknown): ParsedBody | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'request body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;

  const address = typeof b.address === 'string' ? b.address.trim() : '';
  if (!address || address.length < 5) {
    return { error: 'A valid property address is required' };
  }

  const tier = b.tier;
  if (tier !== 'base' && tier !== 'premium') {
    return { error: 'Invalid tier. Use base or premium.' };
  }

  const buyerEmail = typeof b.email === 'string' && b.email.trim()
    ? b.email.trim().toLowerCase()
    : null;

  const propertyType = typeof b.propertyType === 'string' && b.propertyType
    ? b.propertyType
    : null;

  const bathroomsRaw = b.bathrooms;
  const bathrooms = (bathroomsRaw === null || bathroomsRaw === undefined || bathroomsRaw === '')
    ? null
    : String(bathroomsRaw);

  return {
    address,
    tier,
    sqft: parseIntOrNull(b.sqft),
    bedrooms: parseIntOrNull(b.bedrooms),
    bathrooms,
    yearBuilt: parseIntOrNull(b.yearBuilt),
    propertyType,
    buyerEmail,
  };
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

  const parsed = parseBody(req.body);
  if ('error' in parsed) {
    return res.status(400).json({ error: 'invalid_body', message: parsed.error });
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || 'unknown';

  try {
    const result = await createCardCheckoutSession({
      address: parsed.address,
      tier: parsed.tier,
      sqft: parsed.sqft,
      bedrooms: parsed.bedrooms,
      bathrooms: parsed.bathrooms,
      yearBuilt: parsed.yearBuilt,
      propertyType: parsed.propertyType,
      buyerEmail: parsed.buyerEmail,
      ipAddress: ip,
      baseUrl: resolveBaseUrl(req),
    });

    return res.status(200).json({
      reportId: result.reportId,
      checkoutUrl: result.checkoutUrl,
      sessionId: result.sessionId,
      // HMAC-bound access token for the /checkout-status poll.
      // Without it the report UUID alone cannot reveal payment status.
      accessToken: result.accessToken,
    });
  } catch (err: unknown) {
    if (err instanceof StripeAccountMismatchError) {
      console.error('[property/create-checkout] account mismatch:', err.message);
      return res.status(503).json({
        error: 'stripe_account_mismatch',
        expected: err.expectedAccountId,
        actual: err.actualAccountId,
      });
    }
    if (err instanceof StripeNotConfiguredError) {
      return res.status(503).json({ error: 'stripe_not_configured' });
    }
    const msg = err instanceof Error ? err.message : 'unknown error';
    // Service layer pre-checks STRIPE_SECRET_KEY with a plain Error.
    if (msg === 'STRIPE_SECRET_KEY not configured') {
      return res.status(503).json({ error: 'stripe_not_configured' });
    }
    // Validation errors from the service layer.
    if (
      msg.includes('address') ||
      msg.includes('tier') ||
      msg.includes('baseUrl')
    ) {
      return res.status(400).json({ error: 'invalid_request', message: msg });
    }
    console.error('[property/create-checkout] unexpected error:', msg, err);
    return res.status(500).json({ error: 'checkout_failed', message: msg });
  }
}
