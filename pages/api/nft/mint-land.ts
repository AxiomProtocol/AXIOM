import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ensureNFTTables, upsertNFTToken } from '../../../lib/nft/db';
import { computeSeed, computeTraits } from '../../../lib/nft/traitEngine';

const LAND_RECEIPT_ABI = [
  'function registerParcel(uint256 tokenId, bytes32 assetRegistryId, string calldata propertyAddress, uint256 maxSupply_) external',
  'function mint(address to, uint256 tokenId, uint256 amount) external',
  'function deployBlock() external view returns (uint256)',
  'function parcels(uint256 tokenId) external view returns (bytes32 assetRegistryId, string propertyAddress, uint256 maxSupply, uint256 totalMinted, bool active, uint256 registeredAt)',
];

const AXIOM_ADMIN_API_KEY = process.env.ADMIN_SOLVENCY_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-axiom-admin-key'];
  if (!adminKey || adminKey !== AXIOM_ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Admin authorization required. Land receipt mints are governance-gated.' });
  }

  const { walletAddress, parcelId, amount = 1, propertyAddress, assetRegistryId, maxSupply, registerFirst = false } = req.body;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  const parcelIdNum = Number(parcelId);
  if (!parcelId || isNaN(parcelIdNum) || parcelIdNum < 1) {
    return res.status(400).json({ error: 'Invalid parcelId — must be a positive integer matching a land registry entry' });
  }

  if (registerFirst) {
    if (!propertyAddress || typeof propertyAddress !== 'string') {
      return res.status(400).json({ error: 'Missing propertyAddress — required when registerFirst=true' });
    }
    if (!assetRegistryId || !/^0x[a-fA-F0-9]{64}$/.test(assetRegistryId)) {
      return res.status(400).json({ error: 'Invalid assetRegistryId — must be a 32-byte hex value (bytes32)' });
    }
  }

  const contractAddress = process.env.NFT_CONTRACT_LAND;
  if (!contractAddress) {
    return res.status(503).json({ error: 'Land Receipt contract not configured. Deploy the contract first.' });
  }

  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) return res.status(503).json({ error: 'Minter not configured' });

  try {
    await ensureNFTTables();

    const rpcUrl   = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer   = new ethers.Wallet(deployerKey, provider);
    const contract = new ethers.Contract(contractAddress, LAND_RECEIPT_ABI, signer);

    const deployBlock = await contract.deployBlock();

    let parcelInfo;
    try {
      parcelInfo = await contract.parcels(parcelIdNum);
    } catch {
      parcelInfo = null;
    }

    if (registerFirst || !parcelInfo?.active) {
      if (!propertyAddress) {
        return res.status(400).json({ error: 'Parcel not registered. Provide propertyAddress and assetRegistryId with registerFirst=true to register and mint in one call.' });
      }
      const regId = assetRegistryId ?? ('0x' + parcelIdNum.toString(16).padStart(64, '0'));
      const cap   = maxSupply ?? 1000;

      const regTx = await contract.registerParcel(parcelIdNum, regId, propertyAddress, cap, { gasLimit: 200_000 });
      await regTx.wait();
    }

    const mintTx = await contract.mint(walletAddress, parcelIdNum, Number(amount), { gasLimit: 200_000 });
    const mintReceipt = await mintTx.wait();

    const seed   = computeSeed(parcelIdNum, contractAddress, Number(deployBlock), walletAddress);
    const traits = computeTraits(seed);

    await upsertNFTToken({
      tokenId:         parcelIdNum,
      contractAddress,
      contractType:    'ERC1155',
      ownerAddress:    walletAddress,
      traitSeed:       seed,
      rarityTier:      traits.rarityTier,
      rarityScore:     traits.rarityScore,
      traitsJson:      { ...traits, propertyAddress: propertyAddress ?? parcelInfo?.propertyAddress },
      mintedAt:        new Date(),
    });

    return res.status(200).json({
      success:          true,
      parcelId:         parcelIdNum,
      propertyAddress:  propertyAddress ?? parcelInfo?.propertyAddress,
      amount:           Number(amount),
      txHash:           mintReceipt.hash,
      rarityTier:       traits.rarityTier,
    });
  } catch (err: unknown) {
    console.error('[api/nft/mint-land]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Land Receipt mint failed' });
  }
}
