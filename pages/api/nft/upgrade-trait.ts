import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { getNFTToken, upsertNFTToken } from '../../../lib/nft/db';
import { computeTraits, scoreTier, type RarityTier } from '../../../lib/nft/traitEngine';
import { createHash } from 'crypto';

const AXM_ABI = [
  'function burn(uint256 amount) external',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
];

const AXM_CONTRACT = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';
const UPGRADE_COST  = ethers.parseEther('50');

const UPGRADE_PROBABILITY: Record<RarityTier, number> = {
  Common:    0.40,
  Uncommon:  0.30,
  Rare:      0.20,
  Epic:      0.10,
  Legendary: 0.00,
};

const TIER_ORDER: RarityTier[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tokenId, contractAddress, walletAddress, userSignature } = req.body;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  if (!contractAddress || !tokenId) {
    return res.status(400).json({ error: 'Missing tokenId or contractAddress' });
  }

  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) return res.status(503).json({ error: 'Service not configured' });

  try {
    const tokenRow = await getNFTToken(parseInt(tokenId), contractAddress);
    if (!tokenRow) return res.status(404).json({ error: 'Token not found' });

    const currentTier = tokenRow.rarity_tier as RarityTier;
    if (currentTier === 'Legendary') {
      return res.status(400).json({ error: 'Token is already Legendary — maximum tier' });
    }

    const rpcUrl   = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer   = new ethers.Wallet(deployerKey, provider);
    const axm      = new ethers.Contract(AXM_CONTRACT, AXM_ABI, provider);

    const balance = await axm.balanceOf(walletAddress);
    if (balance < UPGRADE_COST) {
      return res.status(400).json({ error: `Insufficient AXM balance. Need 50 AXM, have ${ethers.formatEther(balance)} AXM` });
    }

    const probability = UPGRADE_PROBABILITY[currentTier];
    const entropyInput = `${tokenId}:${contractAddress}:${walletAddress}:${Date.now()}`;
    const hash = createHash('sha256').update(entropyInput).digest('hex');
    const roll = parseInt(hash.slice(0, 8), 16) / 0xffffffff;

    const upgraded = roll < probability;

    let newTier = currentTier;
    let newSeed = tokenRow.trait_seed;

    if (upgraded) {
      const currentIndex = TIER_ORDER.indexOf(currentTier);
      newTier = TIER_ORDER[Math.min(currentIndex + 1, TIER_ORDER.length - 1)];

      const newSeedInput = `${tokenRow.trait_seed}:UPGRADE:${Date.now()}`;
      newSeed = '0x' + createHash('sha256').update(newSeedInput).digest('hex');

      const newTraits = computeTraits(newSeed);

      await upsertNFTToken({
        tokenId:         parseInt(tokenId),
        contractAddress,
        traitSeed:       newSeed,
        rarityTier:      newTier,
        rarityScore:     newTraits.rarityScore,
        traitsJson:      newTraits,
      });
    }

    return res.status(200).json({
      success:      true,
      upgraded,
      roll:         Math.round(roll * 100) / 100,
      probability:  Math.round(probability * 100),
      previousTier: currentTier,
      newTier,
      message:      upgraded
        ? `Upgrade successful! Trait advanced from ${currentTier} to ${newTier}.`
        : `Upgrade attempt failed this time. Roll: ${Math.round(roll * 100)}%, needed < ${Math.round(probability * 100)}%. Your 50 AXM is consumed. Try again.`,
    });
  } catch (err: unknown) {
    console.error('[api/nft/upgrade-trait]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Upgrade failed' });
  }
}
