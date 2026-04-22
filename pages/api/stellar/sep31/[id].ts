/**
 * GET /api/stellar/sep31/[id]
 *
 * Polls the active anchor for the current status of a SEP-31 transaction.
 * Requires SEP-10 authentication (caller provides keypair via query params).
 * Also updates the corresponding DB record with the latest status.
 *
 * Path param:
 *   id — the SEP-31 transaction ID returned by the anchor at initiation
 *
 * Query params:
 *   stellar_public_key  (required)
 *   stellar_secret_key  (required)
 *
 * Response 200: Sep31StatusResponse (id, status, amountIn, amountOut, etc.)
 * Response 400: { error }
 * Response 501: { error } — anchor does not support SEP-31
 * Response 500: { error }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getStellarPaymentAdapter } from '../../../../lib/multichain/stellar/StellarPaymentAdapter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, stellar_public_key, stellar_secret_key } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }
  if (!stellar_public_key || !stellar_secret_key) {
    return res.status(400).json({ error: 'stellar_public_key and stellar_secret_key are required for SEP-10 auth' });
  }

  try {
    const adapter = getStellarPaymentAdapter();
    const status = await adapter.getSep31TransactionStatus(
      id,
      String(stellar_public_key),
      String(stellar_secret_key)
    );
    return res.status(200).json(status);
  } catch (err: any) {
    const isUnavailable = err.message?.includes('does not expose DIRECT_PAYMENT_SERVER');
    const status = isUnavailable ? 501 : 500;
    return res.status(status).json({ error: err.message ?? 'SEP-31 status poll failed' });
  }
}
