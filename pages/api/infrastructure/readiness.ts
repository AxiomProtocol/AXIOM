/**
 * GET /api/infrastructure/readiness
 *
 * Returns the per-chain integration readiness state for all
 * expansion targets. Shows exactly what artifacts are still
 * missing and what is needed to proceed.
 *
 * Use this endpoint to power:
 *   - Founder Ops expansion readiness view
 *   - Admin integration status dashboard
 *   - Internal tooling for tracking integration progress
 *
 * Security: Internal use. Rate limit in production.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { IntegrationReadinessModel } from '../../../lib/multichain/IntegrationReadinessModel';
import { MultiChainRegistryService } from '../../../lib/multichain/MultiChainRegistryService';
import { getAllExpansionFlags } from '../../../lib/multichain/featureFlags';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  try {
    const allReadiness = IntegrationReadinessModel.getAllReadiness();
    const missingArtifactSummary = IntegrationReadinessModel.getMissingArtifactSummary();
    const chains = MultiChainRegistryService.getExpansionTargets();
    const flags = getAllExpansionFlags();

    const totalBlockingArtifacts = missingArtifactSummary.reduce(
      (sum, c) => sum + c.blockingCount,
      0
    );
    const chainsRequiringPartnership = missingArtifactSummary.filter(
      c => c.partnershipRequired
    ).map(c => c.chainSlug);

    return res.status(200).json({
      schemaVersion: 'readiness-v1',
      asOf: new Date().toISOString(),

      // ── Summary ─────────────────────────────────────────────────────────────
      summary: {
        totalExpansionChains: allReadiness.length,
        chainsCanProceed: allReadiness.filter(r => r.canProceed).length,
        totalBlockingArtifacts,
        chainsRequiringPartnership,
        overallStatus:
          totalBlockingArtifacts === 0
            ? 'all_chains_ready'
            : 'artifacts_pending',
      },

      // ── Per-chain readiness ─────────────────────────────────────────────────
      chains: allReadiness.map(r => ({
        chainSlug: r.chainSlug,
        displayName: r.displayName,
        canProceed: r.canProceed,
        blockingCount: r.blockingCount,
        gatheredCount: r.gatheredCount,
        totalArtifacts: r.totalCount,
        nextActionItems: r.nextActionItems,
        artifacts: r.artifacts.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          status: a.status,
          blocksImplementation: a.blocksImplementation,
          requiresPartnerRelationship: a.requiresPartnerRelationship,
          sourceUrl: a.sourceUrl,
          rationale: a.rationale,
        })),
      })),

      // ── Missing artifact summary (for quick scanning) ───────────────────────
      missingArtifactSummary,

      // ── Feature flag state ──────────────────────────────────────────────────
      featureFlags: flags,

      // ── Chain registry state ────────────────────────────────────────────────
      chainRegistry: chains.map(c => ({
        slug: c.slug,
        displayName: c.displayName,
        status: c.status,
        featureEnabled: c.featureEnabled,
        implementationReady: c.implementationReady,
        sourceFilesStatus: c.sourceFilesStatus,
        sdkStatus: c.sdkStatus,
        docsStatus: c.docsStatus,
      })),
    });
  } catch (err: any) {
    console.error('[api/infrastructure/readiness] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
