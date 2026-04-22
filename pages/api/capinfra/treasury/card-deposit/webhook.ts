import type { NextApiRequest, NextApiResponse } from 'next';
import { handleStripeWebhookEvent } from '../../../../../lib/capinfra/cardDeposits/service';

export const config = {
  api: { bodyParser: false },
};

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
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);

    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'] as string | undefined;
    if (!sig) return res.status(400).json({ error: 'missing_stripe_signature' });

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      // Signature failure is the ONLY case we return non-200. Bad
      // signatures must be rejected so a forged caller cannot replay.
      return res.status(400).json({ error: 'invalid_signature', message: err?.message });
    }

    // Two distinct failure modes after signature verification:
    //   (a) CLAIM failure — gateway insert into the webhook events
    //       table threw before any side effect. The event is NOT yet
    //       durably recorded. Return 5xx so Stripe retries delivery.
    //       Safe because no row was claimed → no duplicate side
    //       effects on retry.
    //   (b) POST-CLAIM side-effect failure — gateway row was inserted
    //       (event durably recorded), then a downstream step (e.g.
    //       deposit lookup, mint loopback) failed. handleStripeWebhookEvent
    //       catches these internally, logs an audit event, and returns
    //       a result. We return 200 because retrying would re-claim
    //       the same event id and short-circuit as duplicate, which
    //       does NOT re-attempt the failed side effect. Remediation
    //       is via the operator console (failed rows are visible) or
    //       a future replay endpoint.
    try {
      const result = await handleStripeWebhookEvent({
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
      // Reaches here only if the gateway claim insert threw.
      console.error('[card-deposit/webhook] claim failure (will retry):', err?.message);
      return res.status(503).json({
        error: 'claim_failed_retry_required',
        message: err?.message ?? 'unknown',
        eventId: event.id,
      });
    }
  } catch (err: any) {
    // Pre-signature errors only (raw body read, key load). Stripe will
    // retry these, which is desired since signature wasn't verified yet.
    console.error('[card-deposit/webhook] pre-verify error:', err?.message);
    return res.status(500).json({ error: 'webhook_processing_failed', message: err?.message });
  }
}
