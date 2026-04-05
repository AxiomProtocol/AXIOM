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

// Strict UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, wallet } = req.query;
  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return res.status(400).json({ error: 'Invalid transfer ID format. Must be a UUID v4.' });
  }

  res.setHeader('Cache-Control', 'no-store');

  try {
    const adapter = getStellarPaymentAdapter('mainnet');

    // Load DB record first for ownership check and interactive URL
    const records = await db
      .select()
      .from(stellarPaymentTransfers)
      .where(eq(stellarPaymentTransfers.id, id))
      .limit(1);

    const record = records[0] ?? null;

    if (!record) {
      return res.status(404).json({ error: `Transfer ${id} not found` });
    }

    // Ownership guard: if caller provides a wallet address, it must match the initiating address
    if (wallet !== undefined) {
      if (typeof wallet !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        return res.status(400).json({ error: 'Invalid wallet address format.' });
      }
      if (record.senderWalletAddress.toLowerCase() !== wallet.toLowerCase()) {
        return res.status(403).json({ error: 'Wallet address does not match transfer record.' });
      }
    }

    const state = await adapter.getTransferState(id);

    return res.status(200).json({
      transferId: id,
      state: state ?? null,
      interactiveUrl: record.sep24InteractiveUrl ?? null,
      asOf: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error fetching transfer state';
    return res.status(500).json({ error: message, asOf: new Date().toISOString() });
  }
}
