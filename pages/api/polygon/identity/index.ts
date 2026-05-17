/**
 * GET /api/polygon/identity?address=0x...&network=mainnet|amoy
 *
 * Returns the ERC-3643 IdentityRegistry state on Polygon PoS for a given wallet.
 * Reads on-chain from the deployed IdentityRegistry using getPolygonIdentityState().
 *
 * Query params:
 *   address  — EVM wallet address (required)
 *   network  — "mainnet" | "amoy" (optional, defaults to "mainnet")
 *
 * Response shape: PolygonIdentityState (from lib/polygon/identity/identityAdapter)
 *
 * When contracts are not yet deployed, returns 200 with contractsDeployed: false
 * and error: "IdentityRegistry not yet deployed on this network."
 *
 * No auth required — read-only on-chain state.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { isAddress } from 'ethers';
import {
  getPolygonIdentityState,
  type PolygonIdentityState,
  type PolygonIdentityNetwork,
} from '../../../../lib/polygon/identity/identityAdapter';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PolygonIdentityState | { error: string }>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { address, network } = req.query;
  const walletAddress = Array.isArray(address) ? address[0] : address;

  if (!walletAddress || !isAddress(walletAddress)) {
    return res.status(400).json({ error: 'Valid wallet address required as ?address= query parameter.' });
  }

  const net = (Array.isArray(network) ? network[0] : network) ?? 'mainnet';
  if (net !== 'mainnet' && net !== 'amoy') {
    return res.status(400).json({ error: 'network must be "mainnet" or "amoy".' });
  }

  try {
    const state = await getPolygonIdentityState(walletAddress, net as PolygonIdentityNetwork);
    return res.status(200).json(state);
  } catch (err) {
    console.error('[polygon/identity] Unexpected error:', err);
    return res.status(500).json({ error: 'Failed to fetch Polygon identity state.' });
  }
}
