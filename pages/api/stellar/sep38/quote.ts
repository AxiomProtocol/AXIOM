/**
 * POST /api/stellar/sep38/quote
 *
 * Requests a firm, time-bound quote from the active anchor (SEP-38).
 * Requires a Stellar keypair for SEP-10 authentication.
 * The returned quote ID can be used in a subsequent SEP-31 initiation.
 *
 * Body (JSON):
 *   sell_asset          (required) — e.g. "stellar:USDC:GA5ZSEJ..."
 *   buy_asset           (required) — e.g. "iso4217:USD"
 *   sell_amount         (one of sell/buy amount required)
 *   buy_amount          (one of sell/buy amount required)
 *   expire_after        (optional) — ISO 8601 duration e.g. "PT5M"
 *   country_code        (optional)
 *   buy_delivery_method (optional)
 *   sell_delivery_method (optional)
 *   stellar_public_key  (required) — keypair public key for SEP-10 auth
 *   stellar_secret_key  (required) — keypair secret key for SEP-10 auth
 *
 * Response:
 *   200 { id, expiresAt, price, sellAsset, sellAmount, buyAsset, buyAmount, fee, anchorId }
 *   400 { error }
 *   501 { error }
 *   500 { error }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getStellarPaymentAdapter } from '../../../../lib/multichain/stellar/StellarPaymentAdapter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    sell_asset,
    buy_asset,
    sell_amount,
    buy_amount,
    expire_after,
    country_code,
    buy_delivery_method,
    sell_delivery_method,
    stellar_public_key,
    stellar_secret_key,
  } = req.body ?? {};

  if (!sell_asset || !buy_asset) {
    return res.status(400).json({ error: 'sell_asset and buy_asset are required' });
  }
  if (!sell_amount && !buy_amount) {
    return res.status(400).json({ error: 'One of sell_amount or buy_amount is required' });
  }
  if (!stellar_public_key || !stellar_secret_key) {
    return res.status(400).json({ error: 'stellar_public_key and stellar_secret_key are required for SEP-10 auth' });
  }

  try {
    const adapter = getStellarPaymentAdapter();
    const quote = await adapter.requestSep38Quote({
      sellAsset: String(sell_asset),
      buyAsset: String(buy_asset),
      sellAmount: sell_amount ? String(sell_amount) : undefined,
      buyAmount: buy_amount ? String(buy_amount) : undefined,
      expireAfter: expire_after ? String(expire_after) : undefined,
      countryCode: country_code ? String(country_code) : undefined,
      buyDeliveryMethod: buy_delivery_method ? String(buy_delivery_method) : undefined,
      sellDeliveryMethod: sell_delivery_method ? String(sell_delivery_method) : undefined,
      stellarPublicKey: String(stellar_public_key),
      stellarSecretKey: String(stellar_secret_key),
    });
    return res.status(200).json(quote);
  } catch (err: any) {
    const isUnavailable = err.message?.includes('does not expose ANCHOR_QUOTE_SERVER');
    const status = isUnavailable ? 501 : 500;
    return res.status(status).json({ error: err.message ?? 'SEP-38 quote failed' });
  }
}
