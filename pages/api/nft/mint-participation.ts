import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ensureNFTTables, upsertNFTToken, upsertNFTBalance, upsertEligibility, getEligibility, claimBurnTx, releaseBurnTx } from '../../../lib/nft/db';
import { computeSeed, computeTraits } from '../../../lib/nft/traitEngine';
import { generateNFTMedia } from '../../../lib/nft/mediaPipeline';

const PARTICIPATION_ABI = [
  'function mint(address to, uint256 tokenId, uint256 amount) external',
  'function totalSupply(uint256 tokenId) external view returns (uint256)',
  'function maxSupply(uint256 tokenId) external view returns (uint256)',
  'function tokenActive(uint256 tokenId) external view returns (bool)',
  'function deployBlock() external view returns (uint256)',
];

const ERC20_TRANSFER_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

// AXUSD GENIUS Act Aligned Token on Arbitrum One
const AXUSD_CONTRACT   = '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C';
const TREASURY_ADDRESS = '0x3fD63728288546AC41dAe3bf25ca383061c3A929';
const MINT_FEE_AXUSD   = BigInt('10000000'); // 10 AXUSD (6 decimals)

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

  const { walletAddress, tokenId, signature, timestamp, feeTxHash } = req.body;
  const amount = 1; // Each participation badge mints exactly 1 token per fee payment

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  if (!signature || !timestamp) {
    return res.status(400).json({
      error: 'Missing SIWE fields — sign the participation mint authorization message',
    });
  }

  if (!feeTxHash || !/^0x[a-fA-F0-9]{64}$/.test(feeTxHash)) {
    return res.status(400).json({
      error: 'Missing feeTxHash — transfer 10 AXUSD to the Axiom treasury first and submit the transaction hash',
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

  const rpcUrl   = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  try {
    await ensureNFTTables();

    // 1. Eligibility check (cheap, no side effects)
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
        error: `${tokenTypeName} already minted for this wallet.`,
        mintedTxHash: eligibility.minted_tx_hash,
      });
    }

    // 2. Verify fee on-chain before claiming the tx hash
    const feeReceipt = await provider.getTransactionReceipt(feeTxHash);
    if (!feeReceipt) {
      return res.status(400).json({ error: 'Fee transaction not found on Arbitrum One — ensure it is confirmed' });
    }
    if (feeReceipt.status !== 1) {
      return res.status(400).json({ error: 'Fee transaction reverted — 10 AXUSD was not successfully transferred' });
    }

    const erc20Interface = new ethers.Interface(ERC20_TRANSFER_ABI);
    const feeLog = feeReceipt.logs.find(log => {
      try {
        const parsed = erc20Interface.parseLog({ topics: log.topics as string[], data: log.data });
        if (!parsed || parsed.name !== 'Transfer') return false;
        const from  = parsed.args[0].toLowerCase();
        const to    = parsed.args[1].toLowerCase();
        const value = parsed.args[2] as bigint;
        return (
          log.address.toLowerCase() === AXUSD_CONTRACT.toLowerCase() &&
          from === walletAddress.toLowerCase() &&
          to   === TREASURY_ADDRESS.toLowerCase() &&
          value >= MINT_FEE_AXUSD
        );
      } catch {
        return false;
      }
    });

    if (!feeLog) {
      return res.status(400).json({
        error: `Fee transaction does not contain a ≥10 AXUSD Transfer from ${walletAddress} to the Axiom treasury (${TREASURY_ADDRESS}) on the AXUSD contract.`,
        axusdContract: AXUSD_CONTRACT,
        treasury:      TREASURY_ADDRESS,
        requiredFee:   '10 AXUSD',
      });
    }

    // 3. Atomically claim the tx hash AFTER validation — prevents TOCTOU race condition.
    //    If two concurrent requests both pass validation, only one will succeed here.
    const claimed = await claimBurnTx({
      txHash:          feeTxHash,
      usedBy:          walletAddress,
      tokenId:         tokenIdNum,
      contractAddress,
    });
    if (!claimed) {
      return res.status(409).json({ error: 'This fee transaction has already been used for a mint. Each payment may only be used once.' });
    }

    // From this point, if the mint fails, release the claim so the user can retry.
    const signer   = new ethers.Wallet(deployerKey, provider);
    const contract = new ethers.Contract(contractAddress, PARTICIPATION_ABI, signer);

    const [isActive, supply, max, deployBlock] = await Promise.all([
      contract.tokenActive(tokenIdNum),
      contract.totalSupply(tokenIdNum),
      contract.maxSupply(tokenIdNum),
      contract.deployBlock(),
    ]);

    if (!isActive) {
      await releaseBurnTx(feeTxHash);
      return res.status(409).json({ error: `Token type ${tokenIdNum} (${tokenTypeName}) is not active` });
    }
    if (Number(max) > 0 && Number(supply) + amount > Number(max)) {
      await releaseBurnTx(feeTxHash);
      return res.status(409).json({ error: `Token type ${tokenIdNum} max supply reached (${max})` });
    }

    let receipt: ethers.TransactionReceipt | null = null;
    try {
      const tx = await contract.mint(walletAddress, tokenIdNum, amount, { gasLimit: 200_000 });
      receipt  = await tx.wait();
    } catch (mintErr) {
      // Release claim so the user can retry with the same fee tx hash
      await releaseBurnTx(feeTxHash).catch(() => undefined);
      throw mintErr;
    }
    if (!receipt) {
      await releaseBurnTx(feeTxHash).catch(() => undefined);
      return res.status(500).json({ error: 'Mint transaction returned null receipt' });
    }

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
        mintedTxHash:    receipt!.hash,
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
      txHash:        receipt!.hash,
      rarityTier:    traits.rarityTier,
      seed,
      feeVerified:   true,
    });
  } catch (err: unknown) {
    console.error('[api/nft/mint-participation]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Mint failed' });
  }
}
