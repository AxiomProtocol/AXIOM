import type { NextApiRequest, NextApiResponse } from 'next';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
const NFT_BASE = `https://arb-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_KEY}`;

async function getNFTsForOwner(wallet: string, contractAddresses?: string[], pageKey?: string) {
  const params = new URLSearchParams({ owner: wallet, withMetadata: 'true' });
  if (contractAddresses?.length) params.append('contractAddresses[]', contractAddresses.join(','));
  if (pageKey) params.append('pageKey', pageKey);
  const res = await fetch(`${NFT_BASE}/getNFTsForOwner?${params}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Alchemy NFT API error: ${res.status}`);
  return res.json();
}

async function isHolderOfCollection(wallet: string, contractAddress: string) {
  const params = new URLSearchParams({ wallet, contractAddress });
  const res = await fetch(`${NFT_BASE}/isHolderOfCollection?${params}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Alchemy NFT API error: ${res.status}`);
  return res.json();
}

async function getContractMetadata(contractAddress: string) {
  const params = new URLSearchParams({ contractAddress });
  const res = await fetch(`${NFT_BASE}/getContractMetadata?${params}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Alchemy NFT API error: ${res.status}`);
  return res.json();
}

async function getNFTMetadata(contractAddress: string, tokenId: string) {
  const params = new URLSearchParams({ contractAddress, tokenId });
  const res = await fetch(`${NFT_BASE}/getNFTMetadata?${params}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Alchemy NFT API error: ${res.status}`);
  return res.json();
}

async function getOwnersForContract(contractAddress: string) {
  const params = new URLSearchParams({ contractAddress, withTokenBalances: 'false' });
  const res = await fetch(`${NFT_BASE}/getOwnersForContract?${params}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Alchemy NFT API error: ${res.status}`);
  return res.json();
}

async function getFloorPrice(contractAddress: string) {
  const params = new URLSearchParams({ contractAddress });
  const res = await fetch(`${NFT_BASE}/getFloorPrice?${params}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Alchemy NFT API error: ${res.status}`);
  return res.json();
}

async function isSpamContract(contractAddress: string) {
  const params = new URLSearchParams({ contractAddress });
  const res = await fetch(`${NFT_BASE}/isSpamContract?${params}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Alchemy NFT API error: ${res.status}`);
  return res.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!ALCHEMY_KEY) return res.status(503).json({ error: 'Alchemy API key not configured' });

  const { action, wallet, contractAddress, tokenId, contracts, pageKey } = req.query;

  const act = typeof action === 'string' ? action : 'owner-nfts';

  try {
    switch (act) {
      case 'owner-nfts': {
        if (!wallet || typeof wallet !== 'string') return res.status(400).json({ error: 'wallet required' });
        const addrs = typeof contracts === 'string' ? contracts.split(',') : undefined;
        const pk = typeof pageKey === 'string' ? pageKey : undefined;
        const data = await getNFTsForOwner(wallet, addrs, pk);
        res.setHeader('Cache-Control', 'public, s-maxage=120');
        return res.status(200).json({ success: true, action: act, data });
      }

      case 'holder-check': {
        if (!wallet || typeof wallet !== 'string') return res.status(400).json({ error: 'wallet required' });
        if (!contractAddress || typeof contractAddress !== 'string') return res.status(400).json({ error: 'contractAddress required' });
        const data = await isHolderOfCollection(wallet, contractAddress);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ success: true, action: act, isHolder: data.isHolderOfCollection ?? false, data });
      }

      case 'contract-metadata': {
        if (!contractAddress || typeof contractAddress !== 'string') return res.status(400).json({ error: 'contractAddress required' });
        const data = await getContractMetadata(contractAddress);
        res.setHeader('Cache-Control', 'public, s-maxage=3600');
        return res.status(200).json({ success: true, action: act, data });
      }

      case 'nft-metadata': {
        if (!contractAddress || typeof contractAddress !== 'string') return res.status(400).json({ error: 'contractAddress required' });
        if (!tokenId || typeof tokenId !== 'string') return res.status(400).json({ error: 'tokenId required' });
        const data = await getNFTMetadata(contractAddress, tokenId);
        res.setHeader('Cache-Control', 'public, s-maxage=3600');
        return res.status(200).json({ success: true, action: act, data });
      }

      case 'owners-for-contract': {
        if (!contractAddress || typeof contractAddress !== 'string') return res.status(400).json({ error: 'contractAddress required' });
        const data = await getOwnersForContract(contractAddress);
        res.setHeader('Cache-Control', 'public, s-maxage=300');
        return res.status(200).json({ success: true, action: act, ownerCount: data.owners?.length ?? 0, data });
      }

      case 'floor-price': {
        if (!contractAddress || typeof contractAddress !== 'string') return res.status(400).json({ error: 'contractAddress required' });
        const data = await getFloorPrice(contractAddress);
        res.setHeader('Cache-Control', 'public, s-maxage=300');
        return res.status(200).json({ success: true, action: act, data });
      }

      case 'spam-check': {
        if (!contractAddress || typeof contractAddress !== 'string') return res.status(400).json({ error: 'contractAddress required' });
        const data = await isSpamContract(contractAddress);
        res.setHeader('Cache-Control', 'public, s-maxage=3600');
        return res.status(200).json({ success: true, action: act, isSpam: data.isSpamContract ?? false, data });
      }

      default:
        return res.status(400).json({
          error: `Unknown action. Valid: owner-nfts, holder-check, contract-metadata, nft-metadata, owners-for-contract, floor-price, spam-check`,
        });
    }
  } catch (err: unknown) {
    console.error(`[api/alchemy/nfts action=${act}]`, err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'NFT API request failed' });
  }
}
