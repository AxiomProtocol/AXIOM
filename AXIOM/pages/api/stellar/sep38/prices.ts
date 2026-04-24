/**
 * GET /api/stellar/sep38/prices
 *
 * Returns indicative exchange rates from the active anchor (SEP-38).
 * All buy assets available against the provided sell_asset are returned.
 * Public endpoint — no auth required.
 *
 * Query params:
 *   sell_asset    (required) — e.g. "stellar:USDC:GA5ZSEJ..."
 *   sell_amount   (required) — e.g. "100"
 *   country_code  (optional) — e.g. "USA"
 *   buy_delivery_method  (optional)
 *   sell_delivery_method (optional)
 *
 * Response:
 *   200 { buyAssets, sellAsset, sellAmount, anchorId }
 *   400 { error } — missing params
 *   501 { error } — anchor does not support SEP-38
 *   500 { error }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getStellarPaymentAdapter } from '../../../../lib/multichain/stellar/StellarPaymentAdapter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sell_asset, sell_amount, country_code, buy_delivery_method, sell_delivery_method } = req.query;

  if (!sell_asset || !sell_amount) {
    return res.status(400).json({ error: 'sell_asset and sell_amount are required query parameters' });
  }

  try {
    const adapter = getStellarPaymentAdapter();
    const result = await adapter.getSep38Prices({
      sellAsset: String(sell_asset),
      sellAmount: String(sell_amount),
      countryCode: country_code ? String(country_code) : undefined,
      buyDeliveryMethod: buy_delivery_method ? String(buy_delivery_method) : undefined,
      sellDeliveryMethod: sell_delivery_method ? String(sell_delivery_method) : undefined,
    });
    return res.status(200).json(result);
  } catch (err: any) {
    const isUnavailable = err.message?.includes('does not expose ANCHOR_QUOTE_SERVER');
    const status = isUnavailable ? 501 : 500;
    return res.status(status).json({ error: err.message ?? 'SEP-38 prices unavailable' });
  }
}
