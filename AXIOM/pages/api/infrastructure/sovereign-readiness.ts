/**
 * GET /api/infrastructure/sovereign-readiness
 *
 * Returns Cosmos / Axiom-native chain planning state.
 * Reflects the long-term sovereign infrastructure planning layer.
 * Nothing here is live, configured, or connected.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { SovereignChainService } from '../../../lib/multichain/SovereignChainService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    const cosmos = SovereignChainService.getCosmosReadiness();
    const planningState = SovereignChainService.getSovereignPlanningState();
    const dbReadiness = await SovereignChainService.getAllReadiness();

    return res.status(200).json({
      schemaVersion: 'sovereign-readiness-v1',
      asOf: new Date().toISOString(),
      overallStatus: planningState.overallStatus,
      cosmosReadiness: cosmos,
      planningState,
      persistedReadinessRecords: dbReadiness,
      note:
        'Cosmos represents the long-term sovereign infrastructure layer. ' +
        'No implementation has started. Architecture decisions have not been made. ' +
        'Arbitrum One remains the core execution layer throughout this planning phase.',
    });
  } catch (err: any) {
    console.error('[api/infrastructure/sovereign-readiness] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
