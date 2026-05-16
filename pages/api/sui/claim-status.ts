import type { NextApiRequest, NextApiResponse } from 'next';
import { checkClaimStatus, fetchCampaign } from '../../../lib/sui/campaignRegistry';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, campaignId } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'address query parameter is required' });
  }

  if (!campaignId || typeof campaignId !== 'string') {
    return res.status(400).json({ error: 'campaignId query parameter is required' });
  }

  if (!/^0x[0-9a-fA-F]+$/.test(campaignId)) {
    return res.status(400).json({ error: 'Invalid campaign ID format' });
  }

  const normalizedAddress = '0x' + address.replace(/^0x/, '').toLowerCase().padStart(64, '0');

  try {
    const [hasClaimed, campaign] = await Promise.all([
      checkClaimStatus(campaignId, normalizedAddress),
      fetchCampaign(campaignId).catch(() => null),
    ]);

    return res.status(200).json({
      address: normalizedAddress,
      campaignId,
      hasClaimed,
      campaign: campaign
        ? {
            label: campaign.label,
            isActive: campaign.isActive,
            isClosed: campaign.isClosed,
            amountPerClaim: campaign.amountPerClaim.toString(),
            poolBalance: campaign.poolBalance.toString(),
            expiresAtEpoch: campaign.expiresAtEpoch.toString(),
          }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to check claim status';
    if (process.env.NODE_ENV === 'development') console.error('[api/sui/claim-status]', err);
    return res.status(500).json({ error: message });
  }
}
