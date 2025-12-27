import { NextApiRequest, NextApiResponse } from 'next';
import { getOrCreateUserData, vaultData } from './index';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { address, amount } = req.body;

  if (!address || !amount) {
    return res.status(400).json({ success: false, error: 'Address and amount required' });
  }

  if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return res.status(400).json({ success: false, error: 'Invalid address' });
  }

  const depositAmount = parseFloat(amount);
  if (isNaN(depositAmount) || depositAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid amount' });
  }

  const userData = getOrCreateUserData(address);
  userData.deposit += depositAmount;
  vaultData[address.toLowerCase()] = userData;

  return res.status(200).json({
    success: true,
    message: 'Deposit successful',
    txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
    newBalance: userData.deposit.toFixed(2),
  });
}
