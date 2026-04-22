/**
 * GET /api/infrastructure/chains
 *
 * Returns the canonical Axiom chain registry.
 * Includes role, status, capabilities, and source-file readiness
 * for every chain in the expansion model.
 *
 * Status values are always explicit:
 *   live        — integrated today
 *   configured  — scaffolding built, not yet live
 *   planned     — architecture decided, build not started
 *   researching — source files / SDKs / partner docs being gathered
 *   disabled    — inactive
 *
 * Query params:
 *   ?status=live|configured|planned|researching
 *   ?role=core_execution|identity_bridge|payments_rail|...
 *   ?slug=arbitrum|polygon|avalanche|stellar|canton|cosmos
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { MultiChainRegistryService } from '../../../lib/multichain/MultiChainRegistryService';
import { CHAIN_REGISTRY } from '../../../lib/multichain/chainRegistry';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    const { status, role, slug } = req.query;

    if (slug && typeof slug === 'string') {
      const chain = MultiChainRegistryService.getChain(slug);
      if (!chain) {
        return res.status(404).json({ error: `Chain slug '${slug}' not found in registry` });
      }
      return res.status(200).json({
        schemaVersion: 'chain-registry-v1',
        chain,
      });
    }

    let chains = MultiChainRegistryService.getAllChains();

    if (status && typeof status === 'string') {
      chains = chains.filter(c => c.status === status);
    }

    if (role && typeof role === 'string') {
      chains = chains.filter(c => c.roles.includes(role as any));
    }

    return res.status(200).json({
      schemaVersion: 'chain-registry-v1',
      asOf: new Date().toISOString(),
      totalChains: chains.length,
      liveChains: chains.filter(c => c.status === 'live').length,
      chains,
      axiomNote:
        'Axiom is the orchestration and policy layer. Arbitrum One is the core ' +
        'live execution environment. All other chains listed are planned or ' +
        'researching — none are live integrations.',
    });
  } catch (err: any) {
    console.error('[api/infrastructure/chains] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
