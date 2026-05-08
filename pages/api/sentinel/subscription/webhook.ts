import type { NextApiRequest, NextApiResponse } from 'next';
import { sentinelBilling, LegacyStripeAccountError } from '../../../../lib/sentinel/billing';
import { StripeAccountMismatchError } from '../../../../lib/stripe/client';

export const config = { api: { bodyParser: false } };

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const signature = req.headers['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  try {
    const rawBody = await readRawBody(req);
    await sentinelBilling.handleWebhook(rawBody.toString('utf8'), signature);
    return res.status(200).json({ received: true });
  } catch (err: unknown) {
    // Stripe account configuration mismatch — clean 409 so ops can diagnose quickly
    if (err instanceof LegacyStripeAccountError || err instanceof StripeAccountMismatchError) {
      console.error('[sentinel/subscription/webhook] Stripe account mismatch:', err);
      return res.status(409).json({ error: 'stripe_account_mismatch', message: (err as Error).message });
    }

    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[sentinel/subscription/webhook]', err);

    // Invalid signature returns 400 so Stripe retries are suppressed
    if (
      message.includes('No signatures found') ||
      message.includes('timestamp') ||
      message.includes('webhook secret')
    ) {
      return res.status(400).json({ error: 'Webhook signature invalid' });
    }

    return res.status(500).json({ error: message });
  }
}
