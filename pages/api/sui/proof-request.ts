import 'server-only';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCampaignById } from '../../../lib/sui/campaignRegistry';
import { generateProof } from '../../../lib/sui/proofs/generateProof';

// =============================================================================
// POST /api/sui/proof-request
//
// Returns a Merkle proof for a given wallet + campaign, ready for on-chain
// submission. All validations run server-side.
//
// Request body:
//   { walletAddress: string; campaignId: string }
//
// Success response:
//   { proof: string[]; amountPerClaim: string; campaignObjectId: string; packageId: string }
//
// Error responses:
//   400 { error: string }   — validation failure
//   404 { error: string }   — campaign or eligibility not found
//   409 { error: string }   — already claimed
//   500 { error: string }   — internal error
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { walletAddress, campaignId } = req.body as {
    walletAddress?: string;
    campaignId?: string;
  };

  // --- Validation ---
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'walletAddress is required' });
  }
  if (!campaignId || typeof campaignId !== 'string') {
    return res.status(400).json({ error: 'campaignId is required' });
  }

  // Sui address format: 0x followed by 1-64 hex characters
  if (!/^0x[0-9a-fA-F]{1,64}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Invalid Sui wallet address format' });
  }

  // --- Campaign lookup ---
  const campaign = getCampaignById(campaignId);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  // --- Campaign state checks ---
  if (campaign.status === 'closed') {
    return res.status(409).json({ error: 'campaign_closed' });
  }
  if (campaign.status !== 'active') {
    return res.status(409).json({ error: 'campaign_inactive' });
  }

  // --- Eligibility check ---
  const { eligibilityList, merkleRoot } = campaign;
  if (!eligibilityList || eligibilityList.length === 0) {
    return res.status(404).json({ error: 'proof_unavailable' });
  }

  const normalizedWallet = walletAddress.toLowerCase();
  const entry = eligibilityList.find(
    (e) => e.address.toLowerCase() === normalizedWallet,
  );

  if (!entry) {
    return res.status(404).json({ error: 'not_eligible' });
  }

  // --- Proof generation ---
  try {
    const proofResult = generateProof(eligibilityList, normalizedWallet);

    if (!proofResult) {
      return res.status(500).json({ error: 'Proof generation failed' });
    }

    const proof = proofResult.proof;

    // Enforce MAX_PROOF_DEPTH (mirrors A1 in Move)
    if (proof.length > 20) {
      return res.status(500).json({ error: 'Proof exceeds MAX_PROOF_DEPTH' });
    }

    return res.status(200).json({
      proof,
      amountPerClaim: String(entry.amount),
      campaignObjectId: campaign.campaignObjectId ?? '',
      packageId: campaign.packageId ?? '',
      merkleRoot,
      campaignLabel: campaign.label,
      network: campaign.network,
    });
  } catch (err) {
    console.error('[proof-request] proof generation error:', err);
    return res.status(500).json({ error: 'Internal error generating proof' });
  }
}
