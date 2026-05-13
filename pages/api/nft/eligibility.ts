import type { NextApiRequest, NextApiResponse } from 'next';
import { ensureNFTTables, getEligibility, upsertEligibility } from '../../../lib/nft/db';

const PARTICIPATION_TYPE_IDS = [1, 2, 3, 4, 5, 6];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { wallet, collection = 'founder', all } = req.query;
    const walletAddress = typeof wallet === 'string' ? wallet : '';

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    try {
      await ensureNFTTables();

      // ?all=true returns founder + all 6 participation types in one response
      if (all === 'true') {
        const [founderRow, ...participationRows] = await Promise.all([
          getEligibility(walletAddress, 'founder'),
          ...PARTICIPATION_TYPE_IDS.map(id => getEligibility(walletAddress, `participation_${id}`)),
        ]);

        const founder = founderRow
          ? {
              eligible:      founderRow.eligible === true,
              minted:        founderRow.minted === true,
              mintedTokenId: founderRow.minted_token_id ?? null,
              mintedTxHash:  founderRow.minted_tx_hash ?? null,
              reason:        founderRow.reason ?? null,
            }
          : { eligible: false, minted: false, mintedTokenId: null, mintedTxHash: null, reason: null };

        const participation = PARTICIPATION_TYPE_IDS.map((id, i) => {
          const row = participationRows[i];
          return {
            tokenId:      id,
            eligible:     row ? row.eligible === true : false,
            minted:       row ? row.minted === true : false,
            mintedTxHash: row?.minted_tx_hash ?? null,
          };
        });

        return res.status(200).json({
          walletAddress:        walletAddress.toLowerCase(),
          founderContract:      process.env.NFT_CONTRACT_FOUNDER      ?? null,
          participationContract: process.env.NFT_CONTRACT_PARTICIPATION ?? null,
          founder,
          participation,
        });
      }

      // Single-collection mode (original behaviour)
      const col = typeof collection === 'string' ? collection : 'founder';
      const row = await getEligibility(walletAddress, col);
      return res.status(200).json({
        walletAddress,
        eligible:      row?.eligible ?? false,
        minted:        row?.minted   ?? false,
        mintedTokenId: row?.minted_token_id ?? null,
        mintedTxHash:  row?.minted_tx_hash  ?? null,
        reason:        row?.reason ?? null,
      });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Eligibility check failed' });
    }
  }

  if (req.method === 'POST') {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || !process.env.ADMIN_SOLVENCY_KEY || adminKey !== process.env.ADMIN_SOLVENCY_KEY) {
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
