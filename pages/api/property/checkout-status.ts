import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * DEPRECATED — task #230 moved Property Analysis report payments off Stripe.
 * Use /api/property/confirm-payment to confirm an on-chain AXUSD transfer,
 * and /api/property/reports/[id] to read report status afterwards.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Allow', '');
  return res.status(410).json({
    error: 'Stripe checkout-status polling has been removed. Use /api/property/confirm-payment then /api/property/reports/[id].',
    code: 'STRIPE_REMOVED',
    replacement: '/api/property/confirm-payment',
  });
}
