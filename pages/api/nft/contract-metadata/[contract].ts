import type { NextApiRequest, NextApiResponse } from 'next';
import { getCollectionStats } from '../../../../lib/nft/db';

const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  'https://axiomprotocol.app'
).replace(/\/+$/, '');
const TREASURY = process.env.TREASURY_ADDRESS ?? '0x3fD63728288546AC41dAe3bf25ca383061c3A929';
const ROYALTY_BPS = 750;

const BLOCKSCOUT_URLS: Record<string, string> = {
  founder:       'https://arbitrum.blockscout.com/address/0x4A651D30097E2b7326A83CbB32c02913dB8b3572#code',
  participation: 'https://arbitrum.blockscout.com/address/0x67f8c7da647AbD50AFb1E2137553Be8c174342Ce#code',
  land:          'https://arbitrum.blockscout.com/address/0x60f60aD6A2242Bc4Aab80233b4C25144368F88db#code',
};

const COLLECTIONS: Record<string, object> = {
  founder: {
    name:                    'Axiom Founder Badge',
    description:             `A soulbound ERC-721 for the first 100 Axiom Protocol founding wallets. Non-transferable. Utility-backed: priority AXAU mint queue, 1.5× governance vote weight, 15% discount on Property Analysis reports.\n\nSource verified on Arbitrum Blockscout: ${BLOCKSCOUT_URLS.founder}`,
    image:                   `${SITE_URL}/og/nft-founder-collection.png`,
    external_link:           `${SITE_URL}/nft`,
    seller_fee_basis_points: ROYALTY_BPS,
    fee_recipient:           TREASURY,
  },
  participation: {
    name:                    'Axiom Participation',
    description:             `Multi-edition ERC-1155 badges earned by completing Axiom Protocol milestones. Six action types: identity, Wealth Practice, governance, property deals, AXAU early adopter, and Founder Circle.\n\nSource verified on Arbitrum Blockscout: ${BLOCKSCOUT_URLS.participation}`,
    image:                   `${SITE_URL}/og/nft-participation-collection.png`,
    external_link:           `${SITE_URL}/nft`,
    seller_fee_basis_points: ROYALTY_BPS,
    fee_recipient:           TREASURY,
  },
  land: {
    name:                    'Axiom Land Receipt',
    description:             `ERC-1155 land-parcel receipt NFTs representing participation records in Axiom Protocol land acquisitions. One token ID per property, capped at 1,000 receipts per parcel.\n\nSource verified on Arbitrum Blockscout: ${BLOCKSCOUT_URLS.land}`,
    image:                   `${SITE_URL}/og/nft-land-collection.png`,
    external_link:           `${SITE_URL}/nft`,
    seller_fee_basis_points: ROYALTY_BPS,
    fee_recipient:           TREASURY,
  },
};

function detectCollection(contractAddress: string): string | null {
  const addr = contractAddress.toLowerCase();
  if (process.env.NFT_CONTRACT_FOUNDER && addr === process.env.NFT_CONTRACT_FOUNDER.toLowerCase()) return 'founder';
  if (process.env.NFT_CONTRACT_PARTICIPATION && addr === process.env.NFT_CONTRACT_PARTICIPATION.toLowerCase()) return 'participation';
  if (process.env.NFT_CONTRACT_LAND && addr === process.env.NFT_CONTRACT_LAND.toLowerCase()) return 'land';
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { contract } = req.query;
  const contractAddress = typeof contract === 'string' ? contract : '';

  if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    return res.status(400).json({ error: 'Invalid contract address' });
  }

  const collection = detectCollection(contractAddress);
  if (!collection) {
    return res.status(404).json({ error: 'Unknown contract address — not an Axiom collection' });
  }
  const config = COLLECTIONS[collection];

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
