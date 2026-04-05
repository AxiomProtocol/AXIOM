/**
 * GET /api/stellar/payment/:id
 *
 * Returns the current state of a Stellar payment transfer.
 * Polls the Circle anchor for the latest status if the transfer is not terminal.
 *
 * :id is the internal DB UUID (not the anchor transfer ID).
 *
 * Returns:
 *   state: StellarTransferState   — full transfer state
 *   interactiveUrl: string | null — Circle's interactive URL (while pending)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getStellarPaymentAdapter } from '../../../../lib/multichain/stellar/StellarPaymentAdapter';
import { db } from '../../../../server/db';
import { stellarPaymentTransfers } from '../../../../shared/stellarSchema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (typeof id !== 'string' || !id.match(/^[0-9a-f-]{36}$/)) {
    return res.status(400).json({ error: 'Invalid transfer ID format. Must be a UUID.' });
  }

  res.setHeader('Cache-Control', 'no-store');

  const adapter = getStellarPaymentAdapter('mainnet');
  const state = await adapter.getTransferState(id);

  if (!state) {
    return res.status(404).json({ error: `Transfer ${id} not found` });
  }

  // Also return the interactive URL from DB (for pending transfers)
  let interactiveUrl: string | null = null;
  try {
    const records = await db
      .select({ interactiveUrl: stellarPaymentTransfers.sep24InteractiveUrl })
      .from(stellarPaymentTransfers)
      .where(eq(stellarPaymentTransfers.id, id))
      .limit(1);
    interactiveUrl = records[0]?.interactiveUrl ?? null;
  } catch {
    // ignore
  }

  return res.status(200).json({
    transferId: id,
    state,
    interactiveUrl,
    asOf: new Date().toISOString(),
  });
}
