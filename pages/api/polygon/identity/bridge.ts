/**
 * POST /api/polygon/identity/bridge
 *
 * Bridges an Arbitrum ERC-3643 credential to Polygon for a given wallet.
 * Reads the verified identity from Arbitrum and creates a mirrored credential
 * on Polygon using the onchainid_mirror bridge mode.
 *
 * Body: { wallet: string }
 *
 * Auth: Internal operator use — add auth middleware before exposing to public.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { polygonIdentityAdapter } from '../../../../lib/multichain/adapters/PolygonIdentityAdapter';
import type { CredentialBridgeResult } from '../../../../lib/multichain/adapters/PolygonIdentityAdapterInterface';
import { isAddress } from 'ethers';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CredentialBridgeResult | { error: string }>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { wallet } = req.body as { wallet?: string };

  if (!wallet || !isAddress(wallet)) {
    return res.status(400).json({ error: 'Valid wallet address required in request body.' });
  }

  try {
    const result = await polygonIdentityAdapter.bridgeCredential(wallet);
    const status = result.success ? 200 : 422;
    return res.status(status).json(result);
  } catch (err) {
    console.error('[polygon/identity/bridge] Error:', err);
    return res.status(500).json({ error: 'Failed to bridge credential to Polygon.' });
  }
}
