/**
 * GET /api/infrastructure/corridors
 *
 * Returns known settlement and bridge corridors between networks.
 * Classifies each as direct, assisted, or future.
 *
 * Query params:
 *   ?path=direct|assisted|future
 *   ?network=arbitrum|polygon|stellar|...
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { CorridorRoutingService } from '../../../lib/multichain/CorridorRoutingService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    const { path, network } = req.query;

    let corridors = network && typeof network === 'string'
      ? await CorridorRoutingService.getCorridorsForNetwork(network)
      : await CorridorRoutingService.getAllCorridors();

    if (path && typeof path === 'string') {
      corridors = corridors.filter(c => c.path === path);
    }

    const byPath = await CorridorRoutingService.getCorridorsByPath();

    return res.status(200).json({
      schemaVersion: 'corridors-v1',
      asOf: new Date().toISOString(),
      totalCorridors: corridors.length,
      directCorridors: byPath.direct.length,
      assistedCorridors: byPath.assisted.length,
      futureCorridors: byPath.future.length,
      corridors,
      pathDefinitions: {
        direct: 'Automated on-chain execution with no manual intervention required',
        assisted: 'Operational steps required — not fully automated',
        future: 'Planned corridor — source files, SDK, or partner agreements not yet in place',
      },
    });
  } catch (err: any) {
    console.error('[api/infrastructure/corridors] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
