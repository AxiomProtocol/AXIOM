import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ensureNFTTables, upsertNFTToken, upsertEligibility, getEligibility } from '../../../lib/nft/db';
import { computeSeed, computeTraits } from '../../../lib/nft/traitEngine';
import { generateNFTMedia } from '../../../lib/nft/mediaPipeline';

const FOUNDER_BADGE_ABI = [
  'function mint(address to, uint256 tokenId) external',
  'function totalMinted() external view returns (uint256)',
  'function MAX_SUPPLY() external view returns (uint256)',
  'function deployBlock() external view returns (uint256)',
  'function traitSeed(uint256 tokenId) external view returns (bytes32)',
];

const SIGN_MESSAGE_PREFIX = 'Axiom NFT Mint Authorization\nCollection: founder\nWallet: ';
const SIGN_WINDOW_MS = 5 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress, signature, timestamp } = req.body;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  if (!signature || !timestamp) {
    return res.status(400).json({ error: 'Missing signature and timestamp — sign the authorization message first' });
  }

  const ts = Number(timestamp);
  if (isNaN(ts) || Date.now() - ts > SIGN_WINDOW_MS) {
    return res.status(400).json({ error: 'Signature expired — re-sign within 5 minutes of minting' });
  }

  const message = `${SIGN_MESSAGE_PREFIX}${walletAddress.toLowerCase()}\nTimestamp: ${timestamp}`;
  let recoveredAddress: string;
  try {
    recoveredAddress = ethers.verifyMessage(message, signature).toLowerCase();
  } catch {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  if (recoveredAddress !== walletAddress.toLowerCase()) {
    return res.status(401).json({ error: 'Signature signer does not match walletAddress' });
  }

  const contractAddress = process.env.NFT_CONTRACT_FOUNDER;
  if (!contractAddress) {
    return res.status(503).json({ error: 'Founder Badge contract not configured. Deploy the contract first.' });
  }

  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) {
    return res.status(503).json({ error: 'Minter not configured' });
  }

  try {
    await ensureNFTTables();

    const eligibility = await getEligibility(walletAddress, 'founder');

    if (eligibility?.minted) {
      return res.status(409).json({ error: 'Wallet has already minted a Founder Badge' });
    }

    if (!eligibility || eligibility.eligible !== true) {
      return res.status(403).json({
        error: 'Wallet is not on the Founder Badge eligibility list. Eligibility is granted to early AXM holders, governance participants, and founding Wealth Practice members.',
      });
    }

    const rpcUrl = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer   = new ethers.Wallet(deployerKey, provider);
    const contract = new ethers.Contract(contractAddress, FOUNDER_BADGE_ABI, signer);

    const totalMinted  = await contract.totalMinted();
    const maxSupply    = await contract.MAX_SUPPLY();
    const deployBlock  = await contract.deployBlock();

    if (BigInt(totalMinted) >= BigInt(maxSupply)) {
      return res.status(409).json({ error: 'Founder Badge supply cap reached (100/100)' });
    }

    const nextTokenId = Number(totalMinted) + 1;

    const tx = await contract.mint(walletAddress, nextTokenId, { gasLimit: 300_000 });
    const receipt = await tx.wait();

    let seed: string;
    try {
      const onChainSeed = await contract.traitSeed(nextTokenId);
      seed = onChainSeed as string;
    } catch {
      seed = computeSeed(nextTokenId, contractAddress, Number(deployBlock));
    }
    const traits = computeTraits(seed);

    await upsertNFTToken({
      tokenId:         nextTokenId,
      contractAddress,
      contractType:    'ERC721',
      ownerAddress:    walletAddress,
      traitSeed:       seed,
      rarityTier:      traits.rarityTier,
      rarityScore:     traits.rarityByte,
      traitsJson:      traits,
      mintedAt:        new Date(),
    });

    await upsertEligibility({
      walletAddress,
      collection:     'founder',
      eligible:       true,
      minted:         true,
      mintedTokenId:  nextTokenId,
      mintedTxHash:   receipt.hash,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.host}`;
    generateNFTMedia({
      tokenId:         nextTokenId,
      contractAddress,
      traits,
      collectionName:  'Axiom Founder Badge',
      baseUrl,
    }).catch(e => console.warn('[mint-badge] media pipeline error:', e?.message));

    return res.status(200).json({
      success:    true,
      tokenId:    nextTokenId,
      txHash:     receipt.hash,
      rarityTier: traits.rarityTier,
      seed,
    });
  } catch (err: unknown) {
    console.error('[api/nft/mint-badge]', err);
    const message = err instanceof Error ? err.message : 'Mint failed';
    return res.status(500).json({ error: message });
  }
}
