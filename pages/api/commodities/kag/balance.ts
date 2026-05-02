/**
 * GET /api/commodities/kag/balance?address=0x...
 *
 * Read-only KAG ERC-20 balance lookup for a given wallet address.
 *
 * Returns:
 *   - KAG balance in raw units, formatted grams, and troy ounces
 *   - Estimated USD value via CoinGecko KAG/USD (kinesis-silver, direct)
 *   - Contract address (verified, KIN-01 closed) and verification status
 *   - Structured warnings if upstream price is unavailable — no fake data
 *
 * Hard rules:
 *   - GET only. No DB writes. No contract writes. No transactions.
 *   - Read-only: only eth_call balanceOf — no state-changing operations.
 *   - No AXAG issuance. No wrapper token. No custody. No swaps.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getKagBalance } from '../../../../lib/commodities/kagService';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({
      error: 'Missing required query parameter: address',
      example: '/api/commodities/kag/balance?address=0x...',
    });
  }

  if (!ADDRESS_RE.test(address)) {
    return res.status(400).json({
      error: 'Invalid wallet address. Must be a 42-character hex string starting with 0x.',
      received: address,
    });
  }

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  try {
    const result = await getKagBalance(address);

    return res.status(200).json({
      schemaVersion: 'kag-balance-v1',
      readOnly: true,
      noCustodyStatement:
        'This endpoint performs a read-only ERC-20 balanceOf call. ' +
        'Axiom Protocol does not custody, manage, or control any KAG balance. ' +
        'No transaction, swap, or custody action is performed.',
      data: result,
    });
  } catch (err: unknown) {
    console.error('[api/commodities/kag/balance]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
}
