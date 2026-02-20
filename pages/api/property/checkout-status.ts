import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { propertyReports } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { generateReport } from '../../../server/services/property/pipeline';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { session_id, report_id } = req.query;

  if (!session_id && !report_id) {
    return res.status(400).json({ error: 'session_id or report_id is required' });
  }

  try {
    let report;
    if (report_id) {
      [report] = await db.select().from(propertyReports).where(eq(propertyReports.id, report_id as string)).limit(1);
    } else {
      [report] = await db.select().from(propertyReports).where(eq(propertyReports.stripeSessionId, session_id as string)).limit(1);
    }

    if (!report) return res.status(404).json({ error: 'Report not found' });

    if ((report.status === 'pending' || report.status === 'paid') && report.stripeSessionId) {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (stripeKey) {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(stripeKey);
        const session = await stripe.checkout.sessions.retrieve(report.stripeSessionId);

        if (session.payment_status === 'paid') {
          const currentStatus = report.status as string;
          if (currentStatus !== 'generating' && currentStatus !== 'ready') {
            await db.update(propertyReports).set({
              status: 'paid',
              stripePaymentIntentId: session.payment_intent as string,
              buyerEmail: session.customer_email || report.buyerEmail,
              updatedAt: new Date(),
            }).where(eq(propertyReports.id, report.id));

            try {
              await generateReport(report.id);
              return res.status(200).json({ reportId: report.id, status: 'ready' });
            } catch {
              return res.status(200).json({ reportId: report.id, status: 'failed' });
            }
          }
        }
      }
    }

    return res.status(200).json({
      reportId: report.id,
      status: report.status,
      tier: report.tier,
    });
  } catch (err: any) {
    console.error('Checkout status error:', err.message);
    return res.status(500).json({ error: 'Could not check status' });
  }
}
