import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchActiveCampaigns } from '../../../../lib/sui/campaignRegistry';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = parseInt((req.query.limit as string) ?? '20', 10);
    const campaigns = await fetchActiveCampaigns(Math.min(limit, 50));

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
