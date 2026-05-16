import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchActiveCampaigns } from '../../../../lib/sui/campaignRegistry';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = parseInt((req.query.limit as string) ?? '20', 10);
    let campaigns = await fetchActiveCampaigns(Math.min(limit, 50));

    // If event query returned nothing, seed from the configured campaign ID
    const configuredId = process.env.AXIOM_SUI_CAMPAIGN_ID;
    if (campaigns.length === 0 && configuredId) {
      const { fetchCampaign } = await import('../../../../lib/sui/campaignRegistry');
      try {
        const info = await fetchCampaign(configuredId);
        campaigns = [{ objectId: configuredId, info, fetchedAt: Date.now() }];
      } catch {
        // leave empty — campaign may not exist yet
      }
    }

    return res.status(200).json({
      campaigns: campaigns.map(c => ({
        id: c.objectId,
        label: c.info.label,
        amountPerClaim: c.info.amountPerClaim.toString(),
        expiresAtEpoch: c.info.expiresAtEpoch.toString(),
        poolBalance: c.info.poolBalance.toString(),
        isActive: c.info.isActive,
        isClosed: c.info.isClosed,
        fetchedAt: c.fetchedAt,
      })),
      count: campaigns.length,
      network: process.env.AXIOM_SUI_NETWORK ?? 'testnet',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch campaigns';
    if (process.env.NODE_ENV === 'development') console.error('[api/sui/campaigns]', err);
    return res.status(500).json({ error: message });
  }
}
