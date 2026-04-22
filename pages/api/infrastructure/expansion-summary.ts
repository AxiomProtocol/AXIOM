/**
 * GET /api/infrastructure/expansion-summary
 *
 * Returns a single aggregate object for frontend system map use.
 * Combines chain registry, corridors, identity bridges,
 * institutional connectors, and sovereign readiness into one
 * stable response structure designed for visual rendering.
 *
 * Use this endpoint to power:
 *   - System map pages
 *   - Infrastructure overview pages
 *   - Admin expansion dashboards
 *
 * All chain statuses are explicit and accurate.
 * No live connectivity is implied for planned chains.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { MultiChainRegistryService } from '../../../lib/multichain/MultiChainRegistryService';
import { CorridorRoutingService } from '../../../lib/multichain/CorridorRoutingService';
import { CrossChainIdentityService } from '../../../lib/multichain/CrossChainIdentityService';
import { InstitutionalBridgeService } from '../../../lib/multichain/InstitutionalBridgeService';
import { SovereignChainService } from '../../../lib/multichain/SovereignChainService';
import { SettlementRailService } from '../../../lib/multichain/SettlementRailService';
import { getAllExpansionFlags } from '../../../lib/multichain/featureFlags';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');

  try {
    const [
      expansionSummary,
      corridorsByPath,
      identityBridges,
      institutionalConnectors,
      sovereignState,
      settlementRails,
    ] = await Promise.all([
      Promise.resolve(MultiChainRegistryService.getExpansionSummary()),
      CorridorRoutingService.getCorridorsByPath(),
      CrossChainIdentityService.getAllBridges(),
      InstitutionalBridgeService.getAllConnectors(),
      Promise.resolve(SovereignChainService.getSovereignPlanningState()),
      Promise.resolve(SettlementRailService.getAllRails()),
    ]);

    return res.status(200).json({
      schemaVersion: 'expansion-summary-v1',
      asOf: new Date().toISOString(),

      // ── Chain layer map (system map primary data) ──────────────────────────
      layerMap: expansionSummary.layerMap,
      coreExecutionLayer: expansionSummary.coreExecutionLayer,
      expansionTargets: expansionSummary.expansionTargets,

      // ── Counts ──────────────────────────────────────────────────────────────
      counts: {
        totalChains: expansionSummary.totalChains,
        liveChains: expansionSummary.liveChains,
        configuredChains: expansionSummary.configuredChains,
        plannedChains: expansionSummary.plannedChains,
        researchingChains: expansionSummary.researchingChains,
      },

      // ── Corridors ───────────────────────────────────────────────────────────
      corridors: {
        direct: corridorsByPath.direct,
        assisted: corridorsByPath.assisted,
        future: corridorsByPath.future,
        totalFuture: corridorsByPath.future.length,
      },

      // ── Identity bridges ────────────────────────────────────────────────────
      identityBridges: {
        total: identityBridges.length,
        live: identityBridges.filter(b => b.status === 'live').length,
        bridges: identityBridges,
      },

      // ── Institutional connectors ────────────────────────────────────────────
      institutionalConnectors: {
        total: institutionalConnectors.length,
        live: institutionalConnectors.filter(c => c.status === 'live').length,
        connectors: institutionalConnectors,
      },

      // ── Settlement rails ────────────────────────────────────────────────────
      settlementRails: {
        total: settlementRails.length,
        live: settlementRails.filter(r => r.status === 'live').length,
        rails: settlementRails,
      },

      // ── Sovereign readiness ─────────────────────────────────────────────────
      sovereignReadiness: sovereignState,

      // ── Feature flags ───────────────────────────────────────────────────────
      featureFlags: getAllExpansionFlags(),

      // ── Axiom layer architecture statement ─────────────────────────────────
      architecture: {
        orchestrationLayer: 'Axiom Protocol',
        coreExecutionLayer: 'Arbitrum One',
        internalSettlementLayer: 'AXUSD',
        reserveLayer: 'AXAU (structured around PAXG-backed reserve positions)',
        expansionModel: 'Additive rails — external chains extend Axiom capabilities without replacing core layers',
        statement: expansionSummary.axiomRoleStatement,
      },

      // ── Source-file tracking summary ────────────────────────────────────────
      sourceFileTracking: {
        polygon: { docsAttached: false, sdkReviewed: false, sourceFilesAttached: false },
        avalanche: { docsAttached: false, sdkReviewed: false, sourceFilesAttached: false },
        stellar: { docsAttached: false, sdkReviewed: false, sourceFilesAttached: false },
        canton: { docsAttached: false, sdkReviewed: false, sourceFilesAttached: false },
        cosmos: { docsAttached: false, sdkReviewed: false, sourceFilesAttached: false },
        note: 'Source files for all expansion targets are pending. ' +
              'Update expansion_rail_integrations table as files are gathered.',
      },
    });
  } catch (err: any) {
    console.error('[api/infrastructure/expansion-summary] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
