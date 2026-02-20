import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { propertyReports } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { generateReport } from '../../../server/services/property/pipeline';

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
  if (!stripeKey || !webhookSecret) return res.status(503).end();

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);

    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'] as string;

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const reportId = session.metadata?.reportId;

      if (reportId && session.payment_status === 'paid') {
        await db.update(propertyReports).set({
          status: 'paid',
          stripePaymentIntentId: session.payment_intent,
          buyerEmail: session.customer_email || undefined,
          updatedAt: new Date(),
        }).where(eq(propertyReports.id, reportId));

        generateReport(reportId).catch((err) => {
          console.error('Webhook report generation failed:', err.message);
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
