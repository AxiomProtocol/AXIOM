import type { NextApiRequest, NextApiResponse } from 'next';
import { sentinelBilling } from '../../../../lib/sentinel/billing';

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
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[sentinel/subscription/webhook]', err);
    if (message.includes('No signatures found') || message.includes('webhook')) {
      return res.status(400).json({ error: 'Webhook signature invalid' });
    }
    return res.status(500).json({ error: message });
  }
}
