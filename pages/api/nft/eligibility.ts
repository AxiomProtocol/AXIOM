import type { NextApiRequest, NextApiResponse } from 'next';
import { ensureNFTTables, getEligibility, upsertEligibility } from '../../../lib/nft/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { wallet, collection = 'founder' } = req.query;
    const walletAddress = typeof wallet === 'string' ? wallet : '';

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    try {
      await ensureNFTTables();
      const row = await getEligibility(walletAddress, typeof collection === 'string' ? collection : 'founder');
      return res.status(200).json({
        walletAddress,
        eligible:       row?.eligible ?? false,
        minted:         row?.minted   ?? false,
        mintedTokenId:  row?.minted_token_id ?? null,
        mintedTxHash:   row?.minted_tx_hash  ?? null,
        reason:         row?.reason ?? null,
      });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Eligibility check failed' });
    }
  }

  if (req.method === 'POST') {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_SOLVENCY_KEY) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { walletAddress, collection = 'founder', eligible = true, reason } = req.body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    try {
      await ensureNFTTables();
      const row = await upsertEligibility({ walletAddress, collection, eligible, reason });
      return res.status(200).json({ success: true, record: row });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Eligibility update failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
