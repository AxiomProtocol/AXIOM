/**
 * GET /api/infrastructure/identity-bridges
 *
 * Returns cross-chain identity bridge readiness objects.
 * Covers planned credential expansion from Arbitrum ERC-3643
 * to other chains (currently: Polygon).
 *
 * Does not affect the existing Arbitrum-internal IdentityBridgeService.
 *
 * Query params:
 *   ?destinationChain=polygon|...
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { CrossChainIdentityService } from '../../../lib/multichain/CrossChainIdentityService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    const { destinationChain } = req.query;

    if (destinationChain && typeof destinationChain === 'string') {
      const readiness = await CrossChainIdentityService.getBridgeReadiness(destinationChain);
      if (!readiness) {
        return res.status(404).json({
          error: `No identity bridge found for destination chain '${destinationChain}'`,
        });
      }
      return res.status(200).json({
        schemaVersion: 'identity-bridge-v1',
        readiness,
      });
    }

    const bridges = await CrossChainIdentityService.getAllBridges();

    return res.status(200).json({
      schemaVersion: 'identity-bridge-v1',
      asOf: new Date().toISOString(),
      totalBridges: bridges.length,
      liveBridges: bridges.filter(b => b.status === 'live').length,
      bridges,
      existingArbitrumIdentityNote:
        'The Arbitrum-internal ERC-3643 IdentityBridgeService is live and ' +
        'operates independently of this cross-chain expansion layer. ' +
        'The entries above represent future cross-chain credential expansion only.',
    });
  } catch (err: any) {
    console.error('[api/infrastructure/identity-bridges] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
