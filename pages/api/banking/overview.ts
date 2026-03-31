import type { NextApiRequest, NextApiResponse } from 'next';
import { IncreaseService } from '../../../lib/services/IncreaseService';

const isSandbox = (process.env.INCREASE_ENVIRONMENT ?? 'sandbox') === 'sandbox';
const AXIOM_ACCOUNT_ID = isSandbox
  ? (process.env.INCREASE_SANDBOX_ACCOUNT_ID ?? 'sandbox_account_nqaq96bjvvhfn2tstwmh')
  : (process.env.INCREASE_ACCOUNT_ID ?? 'account_3q7ro70b6ma4w5ijgivz');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [account, balance, txResult, accountNumbers] = await Promise.all([
      IncreaseService.getAccount(AXIOM_ACCOUNT_ID),
      IncreaseService.getAccountBalance(AXIOM_ACCOUNT_ID).catch(() => null),
      IncreaseService.listTransactions(AXIOM_ACCOUNT_ID, 5),
      IncreaseService.listAccountNumbers(AXIOM_ACCOUNT_ID),
    ]);

    const recentTx = txResult.data.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      amountFormatted: IncreaseService.formatAmount(tx.amount),
      direction: tx.amount > 0 ? 'credit' : 'debit',
      description: tx.description,
      createdAt: tx.created_at,
    }));

    const hasAccountNumber = accountNumbers.data.length > 0;

    return res.status(200).json({
      success: true,
      data: {
        account: {
          id: account.id,
          name: account.name,
          status: account.status,
          bank: account.bank,
          interestRate: account.interest_rate,
          createdAt: account.created_at,
        },
        balance: balance
          ? {
              available: balance.available_balance,
              current: balance.current_balance,
              availableFormatted: IncreaseService.formatAmount(balance.available_balance),
              currentFormatted: IncreaseService.formatAmount(balance.current_balance),
            }
          : null,
        recentTransactions: recentTx,
        routingInfo: hasAccountNumber
          ? {
              accountNumber: accountNumbers.data[0].account_number,
              routingNumber: accountNumbers.data[0].routing_number,
              name: accountNumbers.data[0].name,
              status: accountNumbers.data[0].status,
            }
          : null,
        environment: process.env.INCREASE_ENVIRONMENT ?? 'sandbox',
        note: process.env.INCREASE_ENVIRONMENT === 'sandbox'
          ? 'Connected to Increase sandbox. No real money is involved.'
          : 'Connected to Increase production — First Internet Bank.',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
