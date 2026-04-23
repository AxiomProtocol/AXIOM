import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * DEPRECATED — Stripe card-deposit checkout.
 *
 * Consumer card payments now route through Coinbase Onramp at /onramp
 * (Card -> USDC -> PSM -> AXUSD/AXAU). Treasury funding moved to direct
 * ACH/wire to the Increase Nexus account documented at /treasury/fund.
 *
 * The webhook receiver at /api/capinfra/treasury/card-deposit/webhook
 * is intentionally left online to drain in-flight events for already
 * paid Checkout sessions.
 *
 * Semantics:
 *   - POST  -> 410 Gone (the rail itself is retired)
 *   - other -> 405 Method Not Allowed with Allow: POST
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
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
