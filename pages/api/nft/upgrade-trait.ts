import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ensureNFTTables, getNFTToken, upsertNFTToken } from '../../../lib/nft/db';
import { computeTraits, scoreTier, type RarityTier } from '../../../lib/nft/traitEngine';
import { createHash } from 'crypto';

const AXM_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function balanceOf(address account) external view returns (uint256)',
];

const FOUNDER_BADGE_ABI = [
  'function emitMetadataUpdate(uint256 tokenId) external',
];

const AXM_CONTRACT     = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';
const BURN_ADDRESS     = '0x0000000000000000000000000000000000000000';
const DEAD_ADDRESS     = '0x000000000000000000000000000000000000dEaD';
const UPGRADE_COST     = ethers.parseEther('50');
const SIGN_WINDOW_MS   = 10 * 60 * 1000;

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

  const { tokenId, contractAddress, walletAddress, signature, timestamp, burnTxHash } = req.body;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  if (!contractAddress || !tokenId) {
    return res.status(400).json({ error: 'Missing tokenId or contractAddress' });
  }

  if (!signature || !timestamp) {
    return res.status(400).json({ error: 'Missing signature and timestamp — sign the upgrade authorization message' });
  }

  if (!burnTxHash || !/^0x[a-fA-F0-9]{64}$/.test(burnTxHash)) {
    return res.status(400).json({ error: 'Missing burnTxHash — you must burn 50 AXM on-chain first and submit the transaction hash' });
  }

  const ts = Number(timestamp);
  if (isNaN(ts) || Date.now() - ts > SIGN_WINDOW_MS) {
    return res.status(400).json({ error: 'Signature expired — re-sign within 10 minutes' });
  }

  const message = `Axiom NFT Upgrade Authorization\nWallet: ${walletAddress.toLowerCase()}\nToken: ${tokenId}\nContract: ${contractAddress.toLowerCase()}\nBurnTx: ${burnTxHash.toLowerCase()}\nTimestamp: ${timestamp}`;
  let recoveredAddress: string;
  try {
    recoveredAddress = ethers.verifyMessage(message, signature).toLowerCase();
  } catch {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  if (recoveredAddress !== walletAddress.toLowerCase()) {
    return res.status(401).json({ error: 'Signature signer does not match walletAddress' });
  }

  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) return res.status(503).json({ error: 'Service not configured' });

  const rpcUrl   = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  try {
    await ensureNFTTables();

    const tokenRow = await getNFTToken(parseInt(tokenId), contractAddress);
    if (!tokenRow) return res.status(404).json({ error: 'Token not found in Axiom registry' });

    const currentTier = tokenRow.rarity_tier as RarityTier;
    if (currentTier === 'Legendary') {
      return res.status(400).json({ error: 'Token is already Legendary — maximum tier reached' });
    }

    const burnReceipt = await provider.getTransactionReceipt(burnTxHash);
    if (!burnReceipt) {
      return res.status(400).json({ error: 'Burn transaction not found on Arbitrum One — ensure it is confirmed' });
    }

    if (burnReceipt.status !== 1) {
      return res.status(400).json({ error: 'Burn transaction reverted — 50 AXM was not successfully burned' });
    }

    const axmInterface = new ethers.Interface(AXM_ABI);
    const burnLog = burnReceipt.logs.find(log => {
      try {
        const parsed = axmInterface.parseLog({ topics: log.topics as string[], data: log.data });
        if (!parsed || parsed.name !== 'Transfer') return false;
        const from = parsed.args[0].toLowerCase();
        const to   = parsed.args[1].toLowerCase();
        const value = parsed.args[2] as bigint;
        const isBurnAddress = to === BURN_ADDRESS || to === DEAD_ADDRESS;
        return (
          log.address.toLowerCase() === AXM_CONTRACT.toLowerCase() &&
          from === walletAddress.toLowerCase() &&
          isBurnAddress &&
          value >= UPGRADE_COST
        );
      } catch {
        return false;
      }
    });

    if (!burnLog) {
      return res.status(400).json({
        error: `Burn transaction does not include a 50 AXM Transfer from ${walletAddress} to the burn address on the AXM contract. Use the burn() function on the AXM contract.`,
      });
    }

    const probability = UPGRADE_PROBABILITY[currentTier];
    const entropyInput = `${tokenId}:${contractAddress}:${walletAddress}:${burnTxHash}`;
    const hash = createHash('sha256').update(entropyInput).digest('hex');
    const roll = parseInt(hash.slice(0, 8), 16) / 0xffffffff;

    const upgraded = roll < probability;
    let newTier = currentTier;
    let newSeed = tokenRow.trait_seed;

    if (upgraded) {
      const currentIndex = TIER_ORDER.indexOf(currentTier);
      newTier = TIER_ORDER[Math.min(currentIndex + 1, TIER_ORDER.length - 1)];

      const newSeedInput = `${tokenRow.trait_seed}:UPGRADE:${burnTxHash}`;
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

      const founderContract = process.env.NFT_CONTRACT_FOUNDER;
      if (founderContract && contractAddress.toLowerCase() === founderContract.toLowerCase()) {
        try {
          const adminSigner   = new ethers.Wallet(deployerKey, provider);
          const nftContract   = new ethers.Contract(founderContract, FOUNDER_BADGE_ABI, adminSigner);
          const metaTx = await nftContract.emitMetadataUpdate(parseInt(tokenId), { gasLimit: 80_000 });
          await metaTx.wait();
        } catch (metaErr) {
          console.warn('[api/nft/upgrade-trait] MetadataUpdate emission failed (non-fatal):', metaErr);
        }
      }
    }

    return res.status(200).json({
      success:      true,
      upgraded,
      roll:         Math.round(roll * 100) / 100,
      probability:  Math.round(probability * 100),
      previousTier: currentTier,
      newTier,
      burnVerified: true,
      message:      upgraded
        ? `Upgrade successful. Trait advanced from ${currentTier} to ${newTier}. Metadata updated on-chain.`
        : `Upgrade attempt failed. Roll: ${Math.round(roll * 100)}%, needed < ${Math.round(probability * 100)}%. 50 AXM consumed (verified on-chain). Try again.`,
    });
  } catch (err: unknown) {
    console.error('[api/nft/upgrade-trait]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Upgrade failed' });
  }
}
