/**
 * GET /api/polygon/identity/[wallet]
 *
 * Returns the Polygon credential bridge state for a given wallet address.
 * Checks whether the wallet's Arbitrum ERC-3643 identity has been mirrored
 * to Polygon and whether it remains valid.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { polygonIdentityAdapter } from '../../../../lib/multichain/adapters/PolygonIdentityAdapter';
import type { CredentialBridgeState } from '../../../../lib/multichain/adapters/PolygonIdentityAdapterInterface';
import { isAddress } from 'ethers';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CredentialBridgeState | { error: string }>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { wallet } = req.query;
  const walletAddress = Array.isArray(wallet) ? wallet[0] : wallet;

  if (!walletAddress || !isAddress(walletAddress)) {
    return res.status(400).json({ error: 'Invalid wallet address.' });
  }

  try {
    const state = await polygonIdentityAdapter.getBridgeState(walletAddress);
    return res.status(200).json(state);
  } catch (err) {
    console.error('[polygon/identity/[wallet]] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch Polygon identity bridge state.' });
  }
}
