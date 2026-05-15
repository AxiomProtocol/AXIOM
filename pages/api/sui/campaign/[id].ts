import type { NextApiRequest, NextApiResponse } from 'next';
import { getCampaignById } from '../../../../lib/sui/campaignRegistry';
import type { SuiCampaign } from '../../../../lib/sui/types';

// =============================================================================
// GET /api/sui/campaign/[id]
//
// Returns a single Sui testnet campaign by ID.
// Server-side only. No private keys. No wallet credentials.
//
// TESTNET ONLY. No monetary value.
// Phase 8 — Staging
// =============================================================================

type ResponseData = { campaign: SuiCampaign } | { error: string };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid campaign ID' });
  }

  const campaign = getCampaignById(id);
  if (!campaign) {
    return res.status(404).json({ error: `Campaign "${id}" not found` });
  }

  return res.status(200).json({ campaign });
}
