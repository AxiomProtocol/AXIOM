import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  sendLendingFundDepositEmail, 
  sendLendingFundWithdrawalEmail, 
  sendLendingFundYieldEmail 
} from '../../../lib/server/resendEmail';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, ...params } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'Notification type required' });
  }

  try {
    let result;

    switch (type) {
      case 'deposit':
        if (!params.investorEmail || !params.amount || !params.txHash) {
          return res.status(400).json({ error: 'Missing required fields for deposit notification' });
        }
        result = await sendLendingFundDepositEmail({
          investorEmail: params.investorEmail,
          investorName: params.investorName || 'Investor',
          amount: params.amount,
          shares: params.shares || '0',
          txHash: params.txHash,
          newBalance: params.newBalance || params.amount
        });
        break;

      case 'withdrawal':
        if (!params.investorEmail || !params.amount || !params.txHash) {
          return res.status(400).json({ error: 'Missing required fields for withdrawal notification' });
        }
        result = await sendLendingFundWithdrawalEmail({
          investorEmail: params.investorEmail,
          investorName: params.investorName || 'Investor',
          amount: params.amount,
          shares: params.shares || '0',
          txHash: params.txHash,
          remainingBalance: params.remainingBalance || '0'
        });
        break;

      case 'yield':
        if (!params.investorEmail || !params.yieldAmount) {
          return res.status(400).json({ error: 'Missing required fields for yield notification' });
        }
        result = await sendLendingFundYieldEmail({
          investorEmail: params.investorEmail,
          investorName: params.investorName || 'Investor',
          yieldAmount: params.yieldAmount,
          period: params.period || 'Monthly Distribution',
          apy: params.apy || '12%',
          totalEarned: params.totalEarned || params.yieldAmount
        });
        break;

      default:
        return res.status(400).json({ error: `Unknown notification type: ${type}` });
    }

    if (result.success) {
      return res.status(200).json({ success: true, message: `${type} notification sent` });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }

  } catch (error: any) {
    console.error('Notification error:', error);
    return res.status(500).json({ error: error.message });
  }
}
