/**
 * AXAU Phase 2C — Public commodity disclosure endpoint.
 *
 * GET /api/axau/commodity-disclosure
 *
 * Public, no-auth surface that aggregates reserve, NAV, oracle, liquidity,
 * mint/redeem, and solvency-snapshot health for AXAU. Read-only; no swaps,
 * no contract writes, no banking-rail dependencies.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getCommodityDisclosure } from '../../../lib/axau/commodityDisclosure';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Public disclosure surface — short-cache so live state propagates quickly
  // but burst traffic does not hammer the RPC provider.
  res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30');

  try {
    const disclosure = await getCommodityDisclosure();
    return res.status(200).json(disclosure);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[axau/commodity-disclosure]', message);
    return res.status(503).json({
      schemaVersion: 'axau-commodity-disclosure-v1',
      error: 'Failed to assemble AXAU commodity disclosure',
      detail: message,
      retryable: true,
    });
  }
}
