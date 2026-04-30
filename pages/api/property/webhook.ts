import type { NextApiRequest, NextApiResponse } from 'next';
import { handlePropertyStripeWebhookEvent } from '../../../lib/property/cardCheckout';
import { getStripe, StripeAccountMismatchError } from '../../../lib/stripe/client';

/**
 * Task #403 — Stripe webhook for Property Analysis report card payments.
 *
 * Mirrors the treasury card-deposit webhook
 * (`pages/api/capinfra/treasury/card-deposit/webhook.ts`):
 *   - account-id pin enforced via `getStripe()` BEFORE signature verify
 *     so we never process events from the wrong Stripe account.
 *   - 503 on account mismatch so Stripe retries after env correction.
 *   - 400 on signature failure (only non-200 success path).
 *   - Gateway-claim idempotency via `property_report_webhook_events`.
 *   - 5xx only when the gateway claim insert itself fails (Stripe retry
 *     is safe). Post-claim failures are recorded internally and we
 *     return 200 to prevent re-claim short-circuiting future retries.
 */

export const config = { api: { bodyParser: false } };

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    return res.status(503).json({ error: 'webhook_not_configured' });
  }

  try {
    let stripe;
    try {
      stripe = await getStripe();
    } catch (err) {
      if (err instanceof StripeAccountMismatchError) {
        console.error('[property/webhook] account mismatch:', err.message);
        return res.status(503).json({
          error: 'stripe_account_mismatch',
          expected: err.expectedAccountId,
          actual: err.actualAccountId,
        });
      }
      throw err;
    }

    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'] as string | undefined;
    if (!sig) return res.status(400).json({ error: 'missing_stripe_signature' });

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      return res.status(400).json({ error: 'invalid_signature', message: err?.message });
    }

    try {
      const result = await handlePropertyStripeWebhookEvent({
        id: event.id,
        type: event.type,
        data: { object: event.data.object },
      });
      return res.status(200).json({
        received: true,
        eventId: event.id,
        eventType: event.type,
        ...result,
      });
    } catch (err: any) {
      // Reaches here only if the gateway claim insert threw — the event
      // was NOT durably recorded, so Stripe should retry.
      console.error('[property/webhook] claim failure (will retry):', err?.message);
      return res.status(503).json({
        error: 'claim_failed_retry_required',
        message: err?.message ?? 'unknown',
        eventId: event.id,
      });
    }
  } catch (err: any) {
    console.error('[property/webhook] pre-verify error:', err?.message);
    return res.status(500).json({ error: 'webhook_processing_failed', message: err?.message });
  }
}
