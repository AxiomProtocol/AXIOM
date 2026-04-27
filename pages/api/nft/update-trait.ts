import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ensureNFTTables, getNFTToken, upsertNFTToken } from '../../../lib/nft/db';
import { computeTraits } from '../../../lib/nft/traitEngine';

const FOUNDER_BADGE_ABI = [
  'function emitMetadataUpdate(uint256 tokenId) external',
  'function ownerOf(uint256 tokenId) external view returns (address)',
];

const PARTICIPATION_ABI = [
  'event MetadataUpdate(uint256 _tokenId)',
];

const LAND_RECEIPT_ABI = [
  'function emitMetadataUpdate(uint256 tokenId) external',
];

const AXIOM_ADMIN_API_KEY = process.env.ADMIN_SOLVENCY_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-axiom-admin-key'];
  if (!adminKey || adminKey !== AXIOM_ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Admin authorization required for trait updates' });
  }

  const { tokenId, contractAddress, newSeed, newRarityTier, newTraitsJson, emitOnChain = true } = req.body;

  if (!contractAddress || !tokenId) {
    return res.status(400).json({ error: 'Missing tokenId or contractAddress' });
  }

  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) return res.status(503).json({ error: 'Service not configured' });

  try {
    await ensureNFTTables();

    const tokenRow = await getNFTToken(parseInt(tokenId), contractAddress);
    if (!tokenRow) return res.status(404).json({ error: 'Token not found in Axiom registry' });

    const effectiveSeed    = newSeed   ?? tokenRow.trait_seed;
    const computedTraits   = computeTraits(effectiveSeed);
    const effectiveTraits  = newTraitsJson ?? computedTraits;
    const effectiveTier    = newRarityTier ?? computedTraits.rarityTier;

    await upsertNFTToken({
      tokenId:         parseInt(tokenId),
      contractAddress,
      traitSeed:       effectiveSeed,
      rarityTier:      effectiveTier,
      rarityScore:     computedTraits.rarityScore,
      traitsJson:      effectiveTraits,
    });

    let onChainEmitted = false;
    let onChainTxHash: string | undefined;

    if (emitOnChain) {
      const rpcUrl  = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const signer   = new ethers.Wallet(deployerKey, provider);

      const founderContract      = process.env.NFT_CONTRACT_FOUNDER;
      const landContract         = process.env.NFT_CONTRACT_LAND;
      const normalizedContract   = contractAddress.toLowerCase();

      let nftContract: ethers.Contract | null = null;

      if (founderContract && normalizedContract === founderContract.toLowerCase()) {
        nftContract = new ethers.Contract(founderContract, FOUNDER_BADGE_ABI, signer);
      } else if (landContract && normalizedContract === landContract.toLowerCase()) {
        nftContract = new ethers.Contract(landContract, LAND_RECEIPT_ABI, signer);
      }

      if (nftContract) {
        try {
          const tx = await nftContract.emitMetadataUpdate(parseInt(tokenId), { gasLimit: 80_000 });
          const receipt = await tx.wait();
          onChainEmitted = true;
          onChainTxHash  = receipt.hash;
        } catch (chainErr) {
          console.warn('[api/nft/update-trait] On-chain MetadataUpdate emission failed:', chainErr);
        }
      }
    }

    return res.status(200).json({
      success:         true,
      tokenId:         parseInt(tokenId),
      contractAddress,
      newSeed:         effectiveSeed,
      newRarityTier:   effectiveTier,
      onChainEmitted,
      onChainTxHash,
    });
  } catch (err: unknown) {
    console.error('[api/nft/update-trait]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Trait update failed' });
  }
}
