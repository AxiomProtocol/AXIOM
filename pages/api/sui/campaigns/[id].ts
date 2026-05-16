import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchCampaign } from '../../../../lib/sui/campaignRegistry';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Campaign ID is required' });
  }

  if (!/^0x[0-9a-fA-F]{1,64}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid Sui object ID format' });
  }

  try {
    const info = await fetchCampaign(id);

    return res.status(200).json({
      id,
      label: info.label,
      merkleRoot: info.merkleRoot,
      amountPerClaim: info.amountPerClaim.toString(),
      expiresAtEpoch: info.expiresAtEpoch.toString(),
      poolBalance: info.poolBalance.toString(),
      isActive: info.isActive,
      isClosed: info.isClosed,
      network: process.env.AXIOM_SUI_NETWORK ?? 'testnet',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch campaign';
    if (process.env.NODE_ENV === 'development') console.error('[api/sui/campaigns/[id]]', err);
    if (message.includes('not found') || message.includes('does not exist')) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    return res.status(500).json({ error: message });
  }
}
