/**
 * GET /api/commodities
 *
 * Lists all commodity assets in the Axiom Tokenized Commodities Integration Layer.
 * Includes Axiom-issued reserve modules, external supported assets, and deferred
 * instruments (e.g. AXAG — NOT LIVE AND NOT ISSUED).
 *
 * Read-only. No DB writes. No contract writes.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { listCommodities } from '../../../lib/commodities/registry';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const commodities = listCommodities();

  return res.status(200).json({
    schemaVersion: 'commodities-registry-v2',
    asOf: new Date().toISOString(),
    readOnly: true,
    count: commodities.length,
    commodities,
    disclosure:
      'This registry covers all commodity assets recognized by Axiom Protocol. ' +
      'axiomIssued and axiomCustodies fields indicate Axiom\'s role for each asset. ' +
      'readOnly:true assets are supported for portfolio visibility only.',
    noCustodyStatement:
      'Axiom Protocol does not issue or custody external commodity assets. ' +
      'AXAG is not live and is not issued.',
  });
}

