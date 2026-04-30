import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { propertyReports } from '../../../shared/propertySchema';
import { eq } from 'drizzle-orm';
import { verifyReportAccess } from '../../../lib/property/cardCheckout';

/**
 * Task #403 — Checkout status poll endpoint for the card-payment flow.
 *
 * The PropertyPaymentModal opens Stripe Checkout in a new tab and polls
 * this endpoint every couple of seconds to detect when the webhook has
 * marked the report `paid` / `ready` / `failed`. Once `ready`, the modal
 * navigates the buyer to `/property/reports/{id}`.
 *
 * Access control (review fix, post-architect): the report UUID alone is
 * NOT sufficient to read payment status. The buyer must also pass the
 * HMAC `accessToken` returned by `/api/property/create-checkout`. This
 * prevents leaked report ids (browser history, shared device, log line
 * exfiltration) from acting as a status oracle. The full report read
 * goes through `/api/property/reports/[id]` which enforces its own
 * ownership rules.
 *
 * Response surface is minimal: status, paid, paymentMethod,
 * paymentConfirmedAt, and a generic `failureReason` when status is
 * `failed`. Internal error text is not echoed.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { reportId, token } = req.query;
  if (!reportId || typeof reportId !== 'string') {
    return res.status(400).json({ error: 'reportId_required' });
  }
  if (!token || typeof token !== 'string' || !verifyReportAccess(reportId, token)) {
    // Always 403 (never 404) so the endpoint can't be used to confirm
    // existence of arbitrary report ids without the matching token.
    return res.status(403).json({ error: 'forbidden' });
  }

  try {
    const [report] = await db.select({
      id: propertyReports.id,
      status: propertyReports.status,
      stripeSessionId: propertyReports.stripeSessionId,
      paymentConfirmedAt: propertyReports.paymentConfirmedAt,
    }).from(propertyReports).where(eq(propertyReports.id, reportId)).limit(1);

    if (!report) return res.status(404).json({ error: 'report_not_found' });

    res.setHeader('Cache-Control', 'no-cache, no-store');
    return res.status(200).json({
      reportId: report.id,
      status: report.status,
      paid: report.status !== 'pending',
      paymentMethod: report.stripeSessionId ? 'card' : 'on-chain',
      paymentConfirmedAt: report.paymentConfirmedAt,
      // Generic, non-leaky failure indicator. The full failure detail
      // stays in operator logs and on the report page.
      failureReason: report.status === 'failed' ? 'report_generation_failed' : null,
    });
  } catch (err: any) {
    console.error('[property/checkout-status] error:', err?.message);
    return res.status(500).json({ error: 'status_lookup_failed' });
  }
}
