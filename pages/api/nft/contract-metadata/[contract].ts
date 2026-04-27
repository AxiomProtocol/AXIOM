import type { NextApiRequest, NextApiResponse } from 'next';
import { getCollectionStats } from '../../../../lib/nft/db';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.REPLIT_DEV_DOMAIN ?? 'localhost:5000'}`;
const TREASURY = process.env.TREASURY_ADDRESS ?? '0x3fD63728288546AC41dAe3bf25ca383061c3A929';
const ROYALTY_BPS = 750;

const COLLECTIONS: Record<string, object> = {
  founder: {
    name:                    'Axiom Founder Badge',
    description:             'A soulbound ERC-721 for the first 100 Axiom Protocol founding wallets. Non-transferable. Utility-backed: priority AXAU mint queue, 1.5× governance vote weight, 15% discount on Property Analysis reports.',
    image:                   `${SITE_URL}/og/nft-founder-collection.png`,
    external_link:           `${SITE_URL}/nft`,
    seller_fee_basis_points: ROYALTY_BPS,
    fee_recipient:           TREASURY,
  },
  participation: {
    name:                    'Axiom Participation',
    description:             'Multi-edition ERC-1155 badges earned by completing Axiom Protocol milestones. Six action types: identity, Wealth Practice, governance, property deals, AXAU early adopter, and Founder Circle.',
    image:                   `${SITE_URL}/og/nft-participation-collection.png`,
    external_link:           `${SITE_URL}/nft`,
    seller_fee_basis_points: ROYALTY_BPS,
    fee_recipient:           TREASURY,
  },
  land: {
    name:                    'Axiom Land Receipt',
    description:             'ERC-1155 land-parcel receipt NFTs representing participation records in Axiom Protocol land acquisitions. One token ID per property, capped at 1,000 receipts per parcel.',
    image:                   `${SITE_URL}/og/nft-land-collection.png`,
    external_link:           `${SITE_URL}/nft`,
    seller_fee_basis_points: ROYALTY_BPS,
    fee_recipient:           TREASURY,
  },
};

function detectCollection(contractAddress: string): string {
  const addr = contractAddress.toLowerCase();
  if (process.env.NFT_CONTRACT_FOUNDER && addr === process.env.NFT_CONTRACT_FOUNDER.toLowerCase()) return 'founder';
  if (process.env.NFT_CONTRACT_PARTICIPATION && addr === process.env.NFT_CONTRACT_PARTICIPATION.toLowerCase()) return 'participation';
  if (process.env.NFT_CONTRACT_LAND && addr === process.env.NFT_CONTRACT_LAND.toLowerCase()) return 'land';
  return 'founder';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { contract } = req.query;
  const contractAddress = typeof contract === 'string' ? contract : '';

  if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    return res.status(400).json({ error: 'Invalid contract address' });
  }

  const collection = detectCollection(contractAddress);
  const config = COLLECTIONS[collection] ?? COLLECTIONS.founder;

  try {
    const stats = await getCollectionStats(contractAddress).catch(() => null);

    const metadata = {
      ...config,
      ...(stats ? { total_minted: parseInt(stats.minted_count ?? '0'), unique_holders: parseInt(stats.unique_holders ?? '0') } : {}),
    };

    res.setHeader('Cache-Control', 'public, s-maxage=3600');
    return res.status(200).json(metadata);
  } catch (err: unknown) {
    console.error('[api/nft/contract-metadata]', err);
    return res.status(500).json({ error: 'Contract metadata fetch failed' });
  }
}
