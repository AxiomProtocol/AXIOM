import type { NextApiRequest, NextApiResponse } from 'next';
import { ensureNFTTables, getCollectionStats, listNFTTokens } from '../../../lib/nft/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const contracts: Record<string, string | undefined> = {
    founder:       process.env.NFT_CONTRACT_FOUNDER,
    participation: process.env.NFT_CONTRACT_PARTICIPATION,
    land:          process.env.NFT_CONTRACT_LAND,
  };

  try {
    await ensureNFTTables();

    const results: Record<string, object> = {};

    for (const [name, addr] of Object.entries(contracts)) {
      if (!addr) {
        results[name] = { deployed: false };
        continue;
      }

      const stats  = await getCollectionStats(addr).catch(() => null);
      const tokens = await listNFTTokens(addr, 12, 0).catch(() => []);

      results[name] = {
        deployed:        true,
        contractAddress: addr,
        mintedCount:     parseInt(stats?.minted_count   ?? '0'),
        uniqueHolders:   parseInt(stats?.unique_holders ?? '0'),
        rarityBreakdown: {
          Legendary: parseInt(stats?.legendary_count ?? '0'),
          Epic:      parseInt(stats?.epic_count      ?? '0'),
          Rare:      parseInt(stats?.rare_count      ?? '0'),
          Uncommon:  parseInt(stats?.uncommon_count  ?? '0'),
          Common:    parseInt(stats?.common_count    ?? '0'),
        },
        recentTokens: tokens.map((t: Record<string, unknown>) => ({
          tokenId:    t.token_id,
          rarityTier: t.rarity_tier,
          imageCid:   t.image_cid,
          owner:      t.owner_address,
          mintedAt:   t.minted_at,
        })),
      };
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(200).json({ collections: results, timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    console.error('[api/nft/collection-stats]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Stats fetch failed' });
  }
}
