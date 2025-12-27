import { NextApiRequest, NextApiResponse } from 'next';

export interface VaultUserData {
  deposit: number;
  rewards: number;
  autoCompound: boolean;
}

export const vaultData: { [address: string]: VaultUserData } = {};

export function getOrCreateUserData(address: string): VaultUserData {
  const key = address.toLowerCase();
  if (!vaultData[key]) {
    vaultData[key] = {
      deposit: 1000,
      rewards: 45.67,
      autoCompound: true,
    };
  }
  return vaultData[key];
}

const compoundHistory = [
  { id: '1', timestamp: Date.now() - 24 * 60 * 60 * 1000, amountCompounded: '12.45', newTotal: '1012.45' },
  { id: '2', timestamp: Date.now() - 48 * 60 * 60 * 1000, amountCompounded: '11.89', newTotal: '1000.00' },
  { id: '3', timestamp: Date.now() - 72 * 60 * 60 * 1000, amountCompounded: '11.34', newTotal: '988.11' },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ success: false, error: 'Address required' });
  }

  const userData = getOrCreateUserData(address);

  return res.status(200).json({
    success: true,
    vault: {
      totalDeposited: '2450000',
      totalRewards: '125000',
      apy: '18.5',
      nextCompound: Date.now() + 4 * 60 * 60 * 1000,
      userDeposit: userData.deposit.toFixed(2),
      userRewards: userData.rewards.toFixed(2),
      autoCompoundEnabled: userData.autoCompound,
    },
    history: compoundHistory,
  });
}
