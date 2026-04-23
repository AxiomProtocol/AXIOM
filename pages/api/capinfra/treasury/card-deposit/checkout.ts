import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * DEPRECATED — Stripe card-deposit checkout.
 *
 * Consumer card payments now route through Coinbase Onramp at /onramp
 * (Card -> USDC -> PSM -> AXUSD/AXAU). Treasury funding moved to direct
 * ACH/wire to the Increase Nexus account documented at /treasury/fund.
 *
 * This endpoint returns 410 Gone so any lingering client cannot create
 * new Stripe Checkout sessions. The webhook receiver is intentionally
 * left online to drain in-flight events for already-paid sessions.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Allow', '');
  return res.status(410).json({
    error: 'endpoint_deprecated',
    message:
      'Card checkout via this endpoint is no longer available. Use /onramp for consumer card payments (Coinbase) or /treasury/fund for treasury wire/ACH instructions.',
    replacements: {
      consumer_card: '/onramp',
      treasury_funding: '/treasury/fund',
    },
  });
}
