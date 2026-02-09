import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const ARBITRUM_RPC = process.env.ALCHEMY_RPC_URL || 'https://arb1.arbitrum.io/rpc';
const VAULT_ADDRESS = process.env.FIXFLIP_VAULT_ADDRESS;

const VAULT_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function lastDepositTime(address account) view returns (uint256)',
  'function withdrawalCooldown() view returns (uint256)'
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const address = req.query.address as string;

  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }

  try {
    if (!VAULT_ADDRESS) {
      return res.status(200).json({
        shares: '0',
        assets: '0',
        depositDate: null,
        canWithdraw: false,
        pendingYield: '0',
        totalEarned: '0'
      });
    }

    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider);

    const [shares, lastDeposit, cooldown] = await Promise.all([
      vault.balanceOf(address),
      vault.lastDepositTime(address),
      vault.withdrawalCooldown()
    ]);

    let assets = 0n;
    if (shares > 0n) {
      assets = await vault.convertToAssets(shares);
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    const canWithdraw = lastDeposit > 0n && (now >= lastDeposit + cooldown);

    const depositDate = lastDeposit > 0n
      ? new Date(Number(lastDeposit) * 1000).toISOString()
      : null;

    return res.status(200).json({
      shares: ethers.formatEther(shares),
      assets: ethers.formatEther(assets),
      depositDate,
      canWithdraw,
      pendingYield: '0',
      totalEarned: '0'
    });
  } catch (error: any) {
    console.error('Error fetching investor position:', error);
    return res.status(200).json({
      shares: '0',
      assets: '0',
      depositDate: null,
      canWithdraw: false,
      pendingYield: '0',
      totalEarned: '0',
      error: error.message
    });
  }
}
