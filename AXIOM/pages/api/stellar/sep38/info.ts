/**
 * GET /api/stellar/sep38/info
 *
 * Returns the list of assets and delivery methods supported by the active anchor
 * for SEP-38 (Anchor RFQ). Resolves ANCHOR_QUOTE_SERVER from the active anchor's
 * stellar.toml or the registry. No auth required.
 *
 * Response:
 *   200 { assets, anchorQuoteServer, anchorId }
 *   501 { error } — anchor does not support SEP-38
 *   500 { error } — network or parse error
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getStellarPaymentAdapter } from '../../../../lib/multichain/stellar/StellarPaymentAdapter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adapter = getStellarPaymentAdapter();
    const info = await adapter.getSep38Info();
    return res.status(200).json(info);
  } catch (err: any) {
    const isUnavailable = err.message?.includes('does not expose ANCHOR_QUOTE_SERVER');
    const status = isUnavailable ? 501 : 500;
    return res.status(status).json({ error: err.message ?? 'SEP-38 info unavailable' });
  }
}
