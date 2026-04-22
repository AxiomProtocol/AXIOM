import { NextApiRequest, NextApiResponse } from 'next';
import { getOrCreateUserData, updateUserData } from './index';

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

  const withdrawAmount = parseFloat(amount);
  if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid amount' });
  }

  try {
    const userData = await getOrCreateUserData(address);
    
    if (withdrawAmount > userData.deposit) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }
    
    const newDeposit = userData.deposit - withdrawAmount;
    await updateUserData(address, { deposit: newDeposit });

    return res.status(200).json({
      success: true,
      message: 'Withdrawal successful',
      txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
      newBalance: newDeposit.toFixed(2),
    });
  } catch (error: any) {
    console.error('Error withdrawing:', error);
    return res.status(500).json({ success: false, error: 'Failed to withdraw' });
  }
}
