import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllCampaigns, getCampaign } from '../../../lib/web3/landAcquisitionService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { campaignId } = req.query;

    if (campaignId) {
      const campaign = await getCampaign(Number(campaignId));
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      return res.status(200).json(campaign);
    }

    const campaigns = await getAllCampaigns();
    return res.status(200).json({ campaigns, count: campaigns.length });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
}
