/**
 * GET /api/polygon/chain-health
 *
 * Returns a full health report for the Polygon PoS integration:
 *   - RPC connectivity
 *   - Block number and age
 *   - Chain ID verification
 *   - Contract deployment status (mainnet + Amoy)
 *   - Identity bridge readiness
 *
 * Used by operator dashboards and the system map.
 * No auth required — read-only health data.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getPolygonChainHealth } from '../../../lib/polygon/chainHealth';
import type { PolygonHealthReport } from '../../../lib/polygon/chainHealth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PolygonHealthReport | { error: string }>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const report = await getPolygonChainHealth();
    const status = report.rpcReachable ? 200 : 503;
    return res.status(status).json(report);
  } catch (err) {
    console.error('[polygon/chain-health] Unexpected error:', err);
    return res.status(500).json({ error: 'Failed to check Polygon chain health.' });
  }
}
