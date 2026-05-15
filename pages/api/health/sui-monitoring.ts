import 'server-only';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getMonitoringSnapshot } from '../../../lib/sui/monitoring/monitoringRegistry';

// =============================================================================
// GET /api/health/sui-monitoring
//
// Aggregate monitoring health: RPC + campaign + integrity + proof telemetry.
// Health classifications: HEALTHY | DEGRADED | CRITICAL
// =============================================================================

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const snapshot = await getMonitoringSnapshot();
    const httpStatus =
      snapshot.systemHealth === 'CRITICAL' ? 503
      : snapshot.systemHealth === 'DEGRADED' ? 200
      : 200;

    return res.status(httpStatus).json(snapshot);
  } catch (err) {
    return res.status(500).json({
      systemHealth: 'CRITICAL',
      error: err instanceof Error ? err.message : 'Monitoring check failed',
      generatedAt: new Date().toISOString(),
    });
  }
}
