/**
 * GET /api/stellar/corridors
 *
 * Returns all Stellar payment corridors with live status.
 * Public endpoint — no auth required.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getStellarPaymentAdapter } from '../../../lib/multichain/stellar/StellarPaymentAdapter';
import { STELLAR_PLANNED_CORRIDORS } from '../../../lib/multichain/stellar/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  const adapter = getStellarPaymentAdapter('mainnet');
  const corridors = await adapter.getAllCorridors();

  return res.status(200).json({
    schemaVersion: 'stellar-corridors-v1',
    asOf: new Date().toISOString(),
    totalCorridors: corridors.length,
    availableCorridors: corridors.filter(c => c.status === 'available').length,
    corridors,
    raw: STELLAR_PLANNED_CORRIDORS,
  });
}
