import type { NextApiRequest, NextApiResponse } from 'next';
import { getCampaignById } from '../../../lib/sui/campaignRegistry';
import type { EligibilityResult } from '../../../lib/sui/types';

// =============================================================================
// POST /api/sui/eligibility
//
// Checks whether a given Sui address is eligible to claim from a campaign.
// Looks up proof data from the server-side proof store.
//
// Body: { address: string; campaignId: string }
//
// Server-side only. No private keys exposed. No wallet credentials.
//
// TESTNET ONLY. No monetary value. Not a canonical Axiom asset.
// Phase 8 — Staging
// =============================================================================

const SUI_ADDRESS_REGEX = /^0x[0-9a-fA-F]{1,64}$/;

type ResponseData = EligibilityResult | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, campaignId } = req.body ?? {};

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'address is required' });
  }
  if (!campaignId || typeof campaignId !== 'string') {
    return res.status(400).json({ error: 'campaignId is required' });
  }
  if (!SUI_ADDRESS_REGEX.test(address)) {
    return res.status(400).json({ error: 'Invalid Sui address format' });
  }

  const campaign = getCampaignById(campaignId);
  if (!campaign) {
    return res.status(404).json({ error: `Campaign "${campaignId}" not found` });
  }

  // Campaign state checks
  if (campaign.isClosed) {
    return res.status(200).json({
      eligible: false,
      address,
      campaignId,
      reason: 'campaign_closed',
    });
  }

  if (!campaign.isActive) {
    return res.status(200).json({
      eligible: false,
      address,
      campaignId,
      reason: 'campaign_inactive',
    });
  }

  // Proof lookup — in staging, proof manifest is loaded from server-side store.
  // In production, this would query the proof manifest file generated during
  // campaign creation via validateEligibilityCsv + buildMerkleTree + generateProof.
  //
  // Phase 8: Proof data not yet populated. Returns proof_unavailable for staging.
  return res.status(200).json({
    eligible: false,
    address,
    campaignId,
    reason: 'proof_unavailable',
  });
}
