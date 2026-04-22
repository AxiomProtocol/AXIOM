/**
 * GET /api/stellar/sep31/info
 *
 * Returns the receiving asset configuration and required transaction fields
 * from the active anchor's SEP-31 DIRECT_PAYMENT_SERVER. No auth required.
 *
 * Response:
 *   200 { receive, directPaymentServer, anchorId }
 *   501 { error } — anchor does not support SEP-31
 *   500 { error }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getStellarPaymentAdapter } from '../../../../lib/multichain/stellar/StellarPaymentAdapter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adapter = getStellarPaymentAdapter();
    const info = await adapter.getSep31Info();
    return res.status(200).json(info);
  } catch (err: any) {
    const isUnavailable = err.message?.includes('does not expose DIRECT_PAYMENT_SERVER');
    const status = isUnavailable ? 501 : 500;
    return res.status(status).json({ error: err.message ?? 'SEP-31 info unavailable' });
  }
}
