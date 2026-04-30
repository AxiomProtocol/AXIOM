import type { NextApiRequest, NextApiResponse } from 'next';
import { getNFTToken, ensureNFTTables } from '../../../../lib/nft/db';
import { computeSeed, computeTraits, traitsToAttributes, generateAnimationHTML } from '../../../../lib/nft/traitEngine';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.REPLIT_DEV_DOMAIN ?? 'localhost:5000'}`;

const COLLECTION_CONFIG: Record<string, {
  name: string;
  description: string;
  contractType: string;
  maxSupply: number;
  deployBlock: number;
}> = {
  founder: {
    name: 'Axiom Founder Badge',
    description: 'A soulbound ERC-721 commemorating the first 100 founding wallets of the Axiom Protocol. Non-transferable. Utility-backed: priority AXAU mint queue, 1.5× governance vote weight, 15% discount on Property Analysis.',
    contractType: 'ERC721',
    maxSupply: 100,
    deployBlock: 300000000,
  },
  participation: {
    name: 'Axiom Participation',
    description: 'Multi-edition ERC-1155 participation badges earned by completing Axiom Protocol milestones: identity registration, Wealth Practice, governance, property deals.',
    contractType: 'ERC1155',
    maxSupply: 10000,
    deployBlock: 300000000,
  },
  land: {
    name: 'Axiom Land Receipt',
    description: 'ERC-1155 land-parcel receipts representing participation in a specific Axiom Protocol land acquisition. One token ID per property, capped at 1,000 receipts per parcel.',
    contractType: 'ERC1155',
    maxSupply: 1000,
    deployBlock: 300000000,
  },
};

// Named character labels for the Axiom Founder Collection.
// When a tokenId has a label, the OpenSea title becomes
// "Axiom Founder Badge #N · THE NAME" and a "Character" attribute is added.
// Tokens not in this map fall back to the generic "Axiom Founder Badge #N" title.
const FOUNDER_LABELS: Record<number, string> = {
  1:  'The Architect',
  2:  'The Sovereign',
  3:  'The Vault',
  4:  'The Guardian',
  5:  'The Sentinel',
  6:  'The Builder',
  7:  'The Oracle',
  8:  'The Railmaster',
  9:  'The Founder',
  10: 'The Apex',
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

  const { tokenId, contract } = req.query;
  const tokenIdNum = parseInt(typeof tokenId === 'string' ? tokenId : Array.isArray(tokenId) ? tokenId[0] : '', 10);

  if (isNaN(tokenIdNum) || tokenIdNum < 1) {
    return res.status(400).json({ error: 'Invalid tokenId' });
  }

  const contractAddress = typeof contract === 'string' ? contract : process.env.NFT_CONTRACT_FOUNDER ?? '';
  const collection = detectCollection(contractAddress);
  const config = COLLECTION_CONFIG[collection] ?? COLLECTION_CONFIG.founder;

  try {
    await ensureNFTTables();

    let tokenRow = await getNFTToken(tokenIdNum, contractAddress);

    let seed: string;
    if (tokenRow?.trait_seed) {
      seed = tokenRow.trait_seed;
    } else {
      seed = computeSeed(tokenIdNum, contractAddress, config.deployBlock);
    }

    const traits = computeTraits(seed);
    const baseAttributes = traitsToAttributes(traits);

    const founderLabel =
      collection === 'founder' ? FOUNDER_LABELS[tokenIdNum] : undefined;

    const attributes = founderLabel
      ? [{ trait_type: 'Character', value: founderLabel }, ...baseAttributes]
      : baseAttributes;

    // CID gateway: use nftstorage.link (dedicated NFT CDN, better uptime for
    // marketplaces like OpenSea/Blur). Works with all Pinata-pinned CIDs.
    // Filter out legacy sha256: pseudo-CIDs that were used as fallbacks before
    // mandatory IPFS pinning was implemented.
    const IPFS_GATEWAY = 'https://nftstorage.link/ipfs';
    const rawImageCid  = tokenRow?.image_cid as string | undefined;
    const imageCid     = rawImageCid && !rawImageCid.startsWith('sha256:') ? rawImageCid : undefined;
    const hasImageData = !!tokenRow?.image_data;
    const animationCid = tokenRow?.animation_cid;

    const imageUrl = imageCid
      ? `${IPFS_GATEWAY}/${imageCid}`
      : hasImageData
        ? `${SITE_URL}/api/nft/image?tokenId=${tokenIdNum}&contractAddress=${encodeURIComponent(contractAddress)}`
        : `${SITE_URL}/api/nft/animation?tokenId=${tokenIdNum}&contract=${contractAddress}`;

    const animationUrl = animationCid
      ? `${IPFS_GATEWAY}/${animationCid}`
      : `${SITE_URL}/api/nft/animation?tokenId=${tokenIdNum}&contract=${contractAddress}`;

    const metadata = {
      name:          founderLabel
        ? `${config.name} #${tokenIdNum} · ${founderLabel}`
        : `${config.name} #${tokenIdNum}`,
      description:   config.description,
      image:         imageUrl,
      animation_url: animationUrl,
      external_url:  `${SITE_URL}/nft?token=${tokenIdNum}&contract=${contractAddress}`,
      attributes,
      properties: {
        rarityTier:   traits.rarityTier,
        rarityByte:   traits.rarityByte,
        collection,
        contractType: config.contractType,
      },
    };

    res.setHeader('Cache-Control', imageCid ? 'public, s-maxage=86400' : 'public, s-maxage=300');
    return res.status(200).json(metadata);
  } catch (err: unknown) {
    console.error('[api/nft/metadata]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Metadata fetch failed' });
  }
}
