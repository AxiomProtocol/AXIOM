import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * DEPRECATED — task #230 removed the Stripe webhook for Property Analysis
 * reports. Payment is now confirmed by the buyer via
 * /api/property/confirm-payment, which verifies the AXUSD transfer on
 * Arbitrum One directly.
 */
export const config = { api: { bodyParser: false } };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Allow', '');
  return res.status(410).json({
    error: 'Stripe webhook for property reports has been removed. Property Analysis report payments are now settled on-chain in AXUSD.',
    code: 'STRIPE_REMOVED',
  });
}
