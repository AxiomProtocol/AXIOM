/**
 * GET /api/commodities
 *
 * Lists all supported external commodity assets in Axiom Protocol.
 * Read-only. No DB writes. No contract writes.
 *
 * Each entry includes the asset's detail route and per-asset API routes
 * so portfolio surfaces can render a complete commodity list without
 * hard-coding asset symbols.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { listSupportedCommodities } from '../../../lib/commodities/registry';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const commodities = listSupportedCommodities();

  return res.status(200).json({
    schemaVersion: 'commodities-list-v1',
    asOf: new Date().toISOString(),
    count: commodities.length,
    commodities,
    disclosure:
      'These are external commodity assets recognized by Axiom for portfolio ' +
      'visibility and disclosure purposes. Axiom does not issue or custody these ' +
      'assets unless explicitly noted by axiomIssues / axiomCustodies fields.',
  });
}
