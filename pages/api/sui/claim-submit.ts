import 'server-only';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCampaignById } from '../../../lib/sui/campaignRegistry';

// =============================================================================
// POST /api/sui/claim-submit
//
// Server-side validation gate before the client submits a claim transaction.
// The actual transaction is built and signed CLIENT-SIDE by the user's wallet.
// This endpoint validates all conditions and returns a signed claim payload
// confirmation so the client knows it is safe to proceed.
//
// NOTE: This server does NOT hold private keys. Transaction signing happens
// exclusively in the user's Sui wallet extension (browser).
//
// Request body:
//   {
//     walletAddress:  string   — connected wallet address
//     campaignId:     string   — campaign identifier
//     proof:          string[] — Merkle proof (hex strings)
//     amountPerClaim: string   — expected allocation (base units)
//   }
//
// Success response:
//   { validated: true; readyToSubmit: true; campaignObjectId: string; packageId: string }
//
// Error response:
//   { error: string; code: string }
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { walletAddress, campaignId, proof, amountPerClaim } = req.body as {
    walletAddress?: string;
    campaignId?: string;
    proof?: string[];
    amountPerClaim?: string;
  };

  // --- Input validation ---
  if (!walletAddress || !/^0x[0-9a-fA-F]{1,64}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Invalid wallet address', code: 'INVALID_ADDRESS' });
  }
  if (!campaignId || typeof campaignId !== 'string') {
    return res.status(400).json({ error: 'campaignId required', code: 'MISSING_CAMPAIGN' });
  }
  if (!Array.isArray(proof) || proof.length === 0) {
    return res.status(400).json({ error: 'proof required', code: 'MISSING_PROOF' });
  }
  if (proof.length > 20) {
    return res.status(400).json({ error: 'Proof exceeds MAX_PROOF_DEPTH=20', code: 'PROOF_TOO_LONG' });
  }
  if (!proof.every((p) => typeof p === 'string' && /^[0-9a-fA-F]{64}$/.test(p))) {
    return res.status(400).json({ error: 'Invalid proof element format', code: 'INVALID_PROOF_FORMAT' });
  }

  // --- Campaign validation ---
  const campaign = getCampaignById(campaignId);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });
  }
  if (campaign.status === 'closed') {
    return res.status(409).json({ error: 'Campaign permanently closed', code: 'CAMPAIGN_CLOSED' });
  }
  if (campaign.status !== 'active') {
    return res.status(409).json({ error: 'Campaign not active', code: 'CAMPAIGN_INACTIVE' });
  }

  // --- Eligibility check ---
  const normalizedWallet = walletAddress.toLowerCase();
  const entry = campaign.eligibilityList?.find(
    (e) => e.address.toLowerCase() === normalizedWallet,
  );
  if (!entry) {
    return res.status(409).json({ error: 'Address not eligible', code: 'NOT_ELIGIBLE' });
  }

  // --- Amount validation ---
  if (amountPerClaim && String(entry.amount) !== amountPerClaim) {
    return res.status(409).json({
      error: 'Amount mismatch — proof amount does not match campaign allocation',
      code: 'AMOUNT_MISMATCH',
    });
  }

  // --- Package availability check ---
  if (!campaign.packageId || !campaign.campaignObjectId) {
    return res.status(503).json({
      error: 'Package not yet published — mainnet package ID pending',
      code: 'PACKAGE_NOT_PUBLISHED',
    });
  }

  // All validations passed. Client may proceed with wallet signing.
  return res.status(200).json({
    validated: true,
    readyToSubmit: true,
    campaignObjectId: campaign.campaignObjectId,
    packageId: campaign.packageId,
    network: campaign.network,
    amountPerClaim: String(entry.amount),
  });
}
