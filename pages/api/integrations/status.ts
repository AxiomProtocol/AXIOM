import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { partnerIntegrations } from '../../../shared/treasurySchema';
import { getProviderStatus, type ProviderName } from '../../../lib/providers/providerStatus';
import { systemStateService } from '../../../lib/services/SystemStateService';
import { eq } from 'drizzle-orm';

const PROVIDERS: ProviderName[] = ['increase', 'circle', 'bitgo', 'paxos'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const rows = await db.select().from(partnerIntegrations);

    if (rows.length === 0) {
      await systemStateService.seedPartnerIntegrations();
    }

    const liveStatuses = Object.fromEntries(
      PROVIDERS.map((p) => [p, getProviderStatus(p)])
    );

    const integrations = PROVIDERS.map((provider) => {
      const dbRow = rows.find((r) => r.partnerName === provider);
      const live = liveStatuses[provider];
      return {
        provider,
        integrationType: dbRow?.integrationType ?? 'unknown',
        status: live.status,
        productionEnabled: live.status === 'live',
        sandboxEnabled: live.status === 'configured',
        environment: live.environment ?? null,
        reason: live.reason ?? null,
        lastSyncAt: dbRow?.lastSyncAt?.toISOString() ?? null,
        metadata: dbRow?.metadata ?? null,
      };
    });

    return res.status(200).json({
      success: true,
      data: integrations,
      summary: {
        live: integrations.filter((i) => i.status === 'live').length,
        configured: integrations.filter((i) => i.status === 'configured').length,
        notConnected: integrations.filter((i) => i.status === 'not_connected').length,
      },
    });
  } catch (err: any) {
    console.error('[api/integrations/status]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch integration status' });
  }
}
