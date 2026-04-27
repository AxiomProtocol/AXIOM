import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ensureNFTTables, upsertNFTToken, upsertNFTBalance, upsertEligibility, getEligibility } from '../../../lib/nft/db';
import { computeSeed, computeTraits } from '../../../lib/nft/traitEngine';
import { generateNFTMedia } from '../../../lib/nft/mediaPipeline';

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

const SIGN_WINDOW_MS = 10 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress, tokenId, amount = 1, signature, timestamp } = req.body;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  if (!signature || !timestamp) {
    return res.status(400).json({
      error: 'Missing SIWE fields — sign the participation mint authorization message first',
    });
  }

  const ts = Number(timestamp);
  if (isNaN(ts) || Date.now() - ts > SIGN_WINDOW_MS) {
    return res.status(400).json({ error: 'Authorization signature expired — re-sign within 10 minutes' });
  }

  const tokenIdNum = parseInt(tokenId, 10);
  if (isNaN(tokenIdNum) || tokenIdNum < 1 || tokenIdNum > 6) {
    return res.status(400).json({ error: 'Invalid tokenId. Valid types: 1–6' });
  }

  const tokenTypeName = TOKEN_TYPES[tokenIdNum];

  const message = `Axiom NFT Mint Authorization\nCollection: participation\nType: ${tokenIdNum}\nWallet: ${walletAddress.toLowerCase()}\nTimestamp: ${timestamp}`;
  let recoveredAddress: string;
  try {
    recoveredAddress = ethers.verifyMessage(message, signature).toLowerCase();
  } catch {
    return res.status(401).json({ error: 'Invalid SIWE signature' });
  }

  if (recoveredAddress !== walletAddress.toLowerCase()) {
    return res.status(401).json({ error: 'Signature signer does not match walletAddress' });
  }

  const contractAddress = process.env.NFT_CONTRACT_PARTICIPATION;
  if (!contractAddress) {
    return res.status(503).json({ error: 'Participation contract not configured. Deploy the contract first.' });
  }

  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) return res.status(503).json({ error: 'Minter not configured' });

  try {
    await ensureNFTTables();

    const eligibility = await getEligibility(walletAddress, `participation_${tokenIdNum}`);
    if (!eligibility || eligibility.eligible !== true) {
      return res.status(403).json({
        error: `Not authorized to mint ${tokenTypeName}. Admin must grant eligibility for this participation type before minting.`,
        tokenType: tokenIdNum,
        tokenTypeName,
      });
    }

    if (eligibility.minted) {
      return res.status(409).json({
        error: `${tokenTypeName} already minted for this wallet. Each wallet may hold one mint per action type.`,
        mintedTxHash: eligibility.minted_tx_hash,
      });
    }

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

    if (!isActive) return res.status(409).json({ error: `Token type ${tokenIdNum} (${tokenTypeName}) is not active` });
    if (Number(max) > 0 && Number(supply) + amount > Number(max)) {
      return res.status(409).json({ error: `Token type ${tokenIdNum} max supply reached (${max})` });
    }

    const tx = await contract.mint(walletAddress, tokenIdNum, amount, { gasLimit: 200_000 });
    const receipt = await tx.wait();

    const seed   = computeSeed(tokenIdNum, contractAddress, Number(deployBlock));
    const traits = computeTraits(seed);

    await Promise.all([
      upsertNFTToken({
        tokenId:         tokenIdNum,
        contractAddress,
        contractType:    'ERC1155',
        traitSeed:       seed,
        rarityTier:      traits.rarityTier,
        rarityScore:     traits.rarityByte,
        traitsJson:      traits,
        mintedAt:        new Date(),
      }),
      upsertNFTBalance({
        tokenId:         tokenIdNum,
        contractAddress,
        holderAddress:   walletAddress,
        balanceDelta:    amount,
      }),
      upsertEligibility({
        walletAddress,
        collection:      `participation_${tokenIdNum}`,
        minted:          true,
        mintedTokenId:   tokenIdNum,
        mintedTxHash:    receipt.hash,
      }),
    ]);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.host}`;
    generateNFTMedia({
      tokenId:         tokenIdNum,
      contractAddress,
      traits,
      collectionName:  'Axiom Participation',
      baseUrl,
    }).catch(e => console.warn('[mint-participation] media pipeline error:', e?.message));

    return res.status(200).json({
      success:       true,
      tokenId:       tokenIdNum,
      tokenTypeName,
      amount,
      txHash:        receipt.hash,
      rarityTier:    traits.rarityTier,
      seed,
    });
  } catch (err: unknown) {
    console.error('[api/nft/mint-participation]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Mint failed' });
  }
}
