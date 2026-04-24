import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * DEPRECATED — task #230 moved Property Analysis report payments off Stripe.
 *
 * Buyers now pay AXUSD on Arbitrum One via:
 *   POST /api/property/create-payment-intent  (returns payment instruction)
 *   POST /api/property/confirm-payment         (verifies on-chain tx, unlocks report)
 *
 * This endpoint is intentionally retained as a 410 Gone so any old client
 * still hitting it gets a clear, actionable error instead of a silent failure.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Allow', '');
  return res.status(410).json({
    error: 'Stripe checkout for Property Analysis reports has been removed. Pay AXUSD on Arbitrum One via /api/property/create-payment-intent.',
    code: 'STRIPE_REMOVED',
    replacement: '/api/property/create-payment-intent',
  });
}
