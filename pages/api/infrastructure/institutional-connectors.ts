/**
 * GET /api/infrastructure/institutional-connectors
 *
 * Returns Canton Network and other institutional bridge readiness state.
 * All entries reflect researching/planned status — no live connectivity.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { InstitutionalBridgeService } from '../../../lib/multichain/InstitutionalBridgeService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    const connectors = await InstitutionalBridgeService.getAllConnectors();
    const readiness = InstitutionalBridgeService.getReadinessReport();

    return res.status(200).json({
      schemaVersion: 'institutional-connectors-v1',
      asOf: new Date().toISOString(),
      overallStatus: readiness.overallStatus,
      totalConnectors: connectors.length,
      liveConnectors: connectors.filter(c => c.status === 'live').length,
      connectors,
      readinessSummary: readiness,
    });
  } catch (err: any) {
    console.error('[api/infrastructure/institutional-connectors] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
