import type { NextApiRequest, NextApiResponse } from 'next';
import { validateEligibilityCsv, generateProofFromEntries, verifyProofLocal } from '../../../lib/sui/proofs/index';
import { fetchCampaign } from '../../../lib/sui/campaignRegistry';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const address = req.method === 'GET'
    ? (req.query.address as string)
    : (req.body?.address as string);
  const campaignId = req.method === 'GET'
    ? (req.query.campaignId as string)
    : (req.body?.campaignId as string);
  const eligibilityCsv = req.method === 'POST'
    ? (req.body?.eligibilityCsv as string)
    : undefined;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'address query parameter is required' });
  }

  if (!campaignId || typeof campaignId !== 'string') {
    return res.status(400).json({ error: 'campaignId query parameter is required' });
  }

  const normalizedAddress = '0x' + address.replace(/^0x/, '').toLowerCase().padStart(64, '0');

  try {
    const campaign = await fetchCampaign(campaignId);

    if (req.method === 'POST' && eligibilityCsv) {
      const validation = validateEligibilityCsv(eligibilityCsv);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid eligibility CSV',
          details: validation.errors,
        });
      }

      const targetEntry = validation.entries.find(e => e.address === normalizedAddress);
      if (!targetEntry) {
        return res.status(200).json({
          eligible: false,
          address: normalizedAddress,
          campaignId,
          message: 'Address not found in eligibility list',
        });
      }

      const proofResult = generateProofFromEntries(targetEntry, validation.entries);

      const localVerified = verifyProofLocal(proofResult.proof, campaign.merkleRoot, proofResult.leaf);
      if (!localVerified) {
        return res.status(500).json({
          error: 'Proof verification failed — Merkle root mismatch between campaign and CSV',
          onChainRoot: campaign.merkleRoot,
          computedRoot: proofResult.root,
        });
      }

      return res.status(200).json({
        eligible: true,
        address: normalizedAddress,
        campaignId,
        amount: proofResult.amount.toString(),
        leaf: proofResult.leaf,
        proof: proofResult.proof,
        root: proofResult.root,
        localVerified,
      });
    }

    return res.status(200).json({
      eligible: null,
      address: normalizedAddress,
      campaignId,
      isActive: campaign.isActive,
      isClosed: campaign.isClosed,
      amountPerClaim: campaign.amountPerClaim.toString(),
      poolBalance: campaign.poolBalance.toString(),
      message: 'Submit POST with eligibilityCsv to generate proof',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Eligibility check failed';
    if (process.env.NODE_ENV === 'development') console.error('[api/sui/eligibility]', err);
    return res.status(500).json({ error: message });
  }
}
