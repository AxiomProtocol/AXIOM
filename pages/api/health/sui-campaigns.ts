import 'server-only';
import type { NextApiRequest, NextApiResponse } from 'next';
import { pollCampaignState, campaignHealthLabel } from '../../../lib/sui/monitoring/campaignStatePoller';
import { runCampaignIntegrityCheck } from '../../../lib/sui/monitoring/campaignIntegrityMonitor';
import { getAllCampaigns } from '../../../lib/sui/campaignRegistry';

// =============================================================================
// GET /api/health/sui-campaigns
//
// Live campaign health check: reads on-chain state for all active campaigns.
// Health: HEALTHY | DEGRADED | CRITICAL
// =============================================================================

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const campaigns = getAllCampaigns().filter((c) => c.campaignObjectId && c.network === 'mainnet');

    const results = await Promise.allSettled(
      campaigns.map(async (c) => {
        const campaignObjectId = c.campaignObjectId ?? '';
        const packageId = c.packageId ?? '';
        const [state, integrity] = await Promise.all([
          pollCampaignState(campaignObjectId),
          runCampaignIntegrityCheck(campaignObjectId, packageId),
        ]);
        return {
          id: c.id,
          label: c.label,
          campaignObjectId: c.campaignObjectId,
          healthLabel: campaignHealthLabel(state),
          isActive: state.isActive,
          isClosed: state.isClosed,
          poolValueRaw: state.poolValueRaw,
          integrityStatus: integrity.overallStatus,
          integrityChecks: integrity.checks.length,
          integrityPassed: integrity.checks.filter((ch) => ch.passed).length,
          fetchedAt: state.fetchedAt,
          error: state.error,
        };
      }),
    );

    const campaignData = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { error: String((r as PromiseRejectedResult).reason) },
    );

    const anyDown = campaignData.some(
      (c) => 'healthLabel' in c && (c.healthLabel === 'ERROR' || c.integrityStatus === 'CRITICAL'),
    );
    const anyWarning = campaignData.some(
      (c) => 'healthLabel' in c && (c.healthLabel === 'PAUSED' || c.integrityStatus === 'WARNING'),
    );

    const overallStatus = anyDown ? 'CRITICAL' : anyWarning ? 'DEGRADED' : 'HEALTHY';
    const httpStatus = overallStatus === 'CRITICAL' ? 503 : 200;

    return res.status(httpStatus).json({
      overallStatus,
      campaigns: campaignData,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      overallStatus: 'CRITICAL',
      error: err instanceof Error ? err.message : 'Campaign health check failed',
      checkedAt: new Date().toISOString(),
    });
  }
}
