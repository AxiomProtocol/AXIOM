import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchCampaign } from '../../../../lib/sui/campaignRegistry';
import { fetchActiveCampaigns } from '../../../../lib/sui/campaignRegistry';

const OLD_CAMPAIGN_ID =
  '0x3d3023694c96f9a71f6737a9aa43166c2f0b376418147cb005db0e17a52b726e';

const TYPO_LABEL = 'AXOOM Genesis';
const CORRECT_LABEL = 'Axiom Genesis';

export interface MigrateStatusResponse {
  oldCampaign: {
    id: string;
    label: string;
    isClosed: boolean;
    poolBalance: string;
    fetchedAt: number;
  } | null;
  newCampaign: {
    id: string;
    label: string;
    isActive: boolean;
    isClosed: boolean;
    poolBalance: string;
    fetchedAt: number;
  } | null;
  isComplete: boolean;
  steps: {
    oldClosed: boolean;
    newCreated: boolean;
    newFunded: boolean;
    newActive: boolean;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MigrateStatusResponse | { error: string }>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const now = Date.now();

  // Fetch old campaign state
  let oldCampaign: MigrateStatusResponse['oldCampaign'] = null;
  try {
    const info = await fetchCampaign(OLD_CAMPAIGN_ID);
    oldCampaign = {
      id: OLD_CAMPAIGN_ID,
      label: info.label,
      isClosed: info.isClosed,
      poolBalance: info.poolBalance.toString(),
      fetchedAt: now,
    };
  } catch {
    // Campaign may not be reachable on configured network
  }

  // Find the correctly-labelled replacement campaign
  let newCampaign: MigrateStatusResponse['newCampaign'] = null;
  try {
    const campaigns = await fetchActiveCampaigns(50);
    const match = campaigns.find(c => c.info.label === CORRECT_LABEL);
    if (match) {
      newCampaign = {
        id: match.objectId,
        label: match.info.label,
        isActive: match.info.isActive,
        isClosed: match.info.isClosed,
        poolBalance: match.info.poolBalance.toString(),
        fetchedAt: match.fetchedAt,
      };
    }
  } catch {
    // Discovery failed
  }

  const steps = {
    oldClosed: oldCampaign?.isClosed === true,
    newCreated: newCampaign !== null,
    newFunded: newCampaign !== null && BigInt(newCampaign.poolBalance) > 0n,
    newActive: newCampaign?.isActive === true,
  };

  const isComplete = steps.oldClosed && steps.newCreated && steps.newFunded && steps.newActive;

  return res.status(200).json({
    oldCampaign,
    newCampaign,
    isComplete,
    steps,
  });
}
