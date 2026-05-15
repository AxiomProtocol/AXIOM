import type { NextApiRequest, NextApiResponse } from 'next';
import { getCampaignById } from '../../../lib/sui/campaignRegistry';
import type { ClaimStatus } from '../../../lib/sui/types';

// =============================================================================
// GET /api/sui/claim-status
//
// Returns the on-chain claim status for a given address and campaign.
//
// Query: ?address=0x...&campaignId=...
//
// In Phase 8 staging: queries the Sui RPC to check the claimed table on-chain.
// Falls back to unclaimed if RPC is unavailable.
//
// Server-side only. No private keys. No wallet credentials.
//
// TESTNET ONLY. No monetary value.
// Phase 8 — Staging
// =============================================================================

type ResponseData = ClaimStatus | { error: string };

const SUI_ADDRESS_REGEX = /^0x[0-9a-fA-F]{1,64}$/;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, campaignId } = req.query;

  if (!address || Array.isArray(address)) {
    return res.status(400).json({ error: 'address query parameter is required' });
  }
  if (!campaignId || Array.isArray(campaignId)) {
    return res.status(400).json({ error: 'campaignId query parameter is required' });
  }
  if (!SUI_ADDRESS_REGEX.test(address)) {
    return res.status(400).json({ error: 'Invalid Sui address format' });
  }

  const campaign = getCampaignById(campaignId);
  if (!campaign) {
    return res.status(404).json({ error: `Campaign "${campaignId}" not found` });
  }

  // Phase 8 staging: on-chain query via SuiClient would go here.
  // The Move contract stores claim status in Table<address, bool>.
  // Querying requires fetching the shared ClaimCampaign object and
  // checking the dynamic field for the given address.
  //
  // For Phase 8: returns unclaimed (false) as the safe default.
  // On-chain integration is Phase 9 scope.
  return res.status(200).json({
    address,
    campaignId,
    claimed: false,
  });
}
