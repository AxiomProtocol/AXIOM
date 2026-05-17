import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * DEPRECATED — 2026-05-17
 * Euler Earn integration has been removed from Axiom Protocol.
 * This route is permanently decommissioned. Refer to the multi-chain
 * DeFi stack: /api/aave/arbitrum/market, /api/benqi/market.
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', '2026-05-17');
  res.setHeader('Link', '</api/aave/arbitrum/market>; rel="successor-version"');
  return res.status(410).json({
    error: 'Gone',
    message:
      'This Euler Earn endpoint has been permanently decommissioned. ' +
      'Axiom Protocol has migrated to a multi-chain DeFi stack.',
    deprecatedAt: '2026-05-17',
    alternatives: [
      '/api/aave/arbitrum/market',
      '/api/benqi/market',
    ],
  });
}
