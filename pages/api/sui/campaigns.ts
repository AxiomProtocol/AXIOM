import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllCampaigns } from '../../../lib/sui/campaignRegistry';
import type { SuiCampaign } from '../../../lib/sui/types';

// =============================================================================
// GET /api/sui/campaigns
//
// Returns all registered Sui testnet campaigns.
// Server-side only. No private keys. No wallet credentials.
//
// TESTNET ONLY. No monetary value. Not canonical Axiom assets.
// Phase 8 — Staging
// =============================================================================

type ResponseData =
  | { campaigns: SuiCampaign[]; count: number; network: string }
  | { error: string };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const campaigns = getAllCampaigns();
    return res.status(200).json({
      campaigns,
      count: campaigns.length,
      network: 'testnet',
    });
  } catch (err) {
    console.error('[/api/sui/campaigns] Error:', err);
    return res.status(500).json({ error: 'Failed to retrieve campaigns' });
  }
}
