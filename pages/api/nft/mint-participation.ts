import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ensureNFTTables, upsertNFTToken } from '../../../lib/nft/db';
import { computeSeed, computeTraits } from '../../../lib/nft/traitEngine';

const PARTICIPATION_ABI = [
  'function mint(address to, uint256 tokenId, uint256 amount) external',
  'function totalSupply(uint256 tokenId) external view returns (uint256)',
  'function maxSupply(uint256 tokenId) external view returns (uint256)',
  'function tokenActive(uint256 tokenId) external view returns (bool)',
  'function deployBlock() external view returns (uint256)',
];

export const TOKEN_TYPES: Record<number, string> = {
  1: 'Identity Registration',
  2: 'Wealth Practice Member',
  3: 'Governance Participant',
  4: 'Property Deal Participant',
  5: 'AXAU Early Adopter',
  6: 'Founder Circle',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress, tokenId, amount = 1 } = req.body;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  const tokenIdNum = parseInt(tokenId, 10);
  if (isNaN(tokenIdNum) || tokenIdNum < 1 || tokenIdNum > 6) {
    return res.status(400).json({ error: 'Invalid tokenId. Valid types: 1–6' });
  }

  const contractAddress = process.env.NFT_CONTRACT_PARTICIPATION;
  if (!contractAddress) {
    return res.status(503).json({ error: 'Participation contract not configured. Deploy the contract first.' });
  }

  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) return res.status(503).json({ error: 'Minter not configured' });

  try {
    await ensureNFTTables();

    const rpcUrl   = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer   = new ethers.Wallet(deployerKey, provider);
    const contract = new ethers.Contract(contractAddress, PARTICIPATION_ABI, signer);

    const [isActive, supply, max, deployBlock] = await Promise.all([
      contract.tokenActive(tokenIdNum),
      contract.totalSupply(tokenIdNum),
      contract.maxSupply(tokenIdNum),
      contract.deployBlock(),
    ]);

    if (!isActive) return res.status(409).json({ error: `Token type ${tokenIdNum} is not active` });
    if (Number(max) > 0 && Number(supply) + amount > Number(max)) {
      return res.status(409).json({ error: `Token type ${tokenIdNum} max supply reached (${max})` });
    }

    const tx = await contract.mint(walletAddress, tokenIdNum, amount, { gasLimit: 200_000 });
    const receipt = await tx.wait();

    const seed   = computeSeed(tokenIdNum, contractAddress, Number(deployBlock), walletAddress);
    const traits = computeTraits(seed);

    await upsertNFTToken({
      tokenId:         tokenIdNum,
      contractAddress,
      contractType:    'ERC1155',
      ownerAddress:    walletAddress,
      traitSeed:       seed,
      rarityTier:      traits.rarityTier,
      rarityScore:     traits.rarityScore,
      traitsJson:      traits,
      mintedAt:        new Date(),
    });

    return res.status(200).json({
      success:       true,
      tokenId:       tokenIdNum,
      tokenTypeName: TOKEN_TYPES[tokenIdNum],
      amount,
      txHash:        receipt.hash,
      rarityTier:    traits.rarityTier,
    });
  } catch (err: unknown) {
    console.error('[api/nft/mint-participation]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Mint failed' });
  }
}
