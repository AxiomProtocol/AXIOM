import type { NextApiRequest, NextApiResponse } from 'next';
import { IncreaseService } from '../../../lib/services/IncreaseService';

const isSandbox = (process.env.INCREASE_ENVIRONMENT ?? 'sandbox') === 'sandbox';
const AXIOM_ACCOUNT_ID = isSandbox
  ? (process.env.INCREASE_SANDBOX_ACCOUNT_ID ?? 'sandbox_account_nqaq96bjvvhfn2tstwmh')
  : (process.env.INCREASE_ACCOUNT_ID ?? 'account_3q7ro70b6ma4w5ijgivz');

function checkAdminKey(req: NextApiRequest): boolean {
  return req.headers['x-admin-key'] === process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAdminKey(req)) return res.status(401).json({ error: 'Unauthorized' });

  const accountId = (req.query.account_id as string) ?? AXIOM_ACCOUNT_ID;
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const includePending = req.query.pending !== 'false';

  try {
    const [txResult, pendingResult] = await Promise.all([
      IncreaseService.listTransactions(accountId, limit),
      includePending ? IncreaseService.listPendingTransactions(accountId) : Promise.resolve({ data: [] }),
    ]);

    const transactions = txResult.data.map((tx) => ({
      id: tx.id,
      type: 'settled',
      amount: tx.amount,
      amountFormatted: IncreaseService.formatAmount(tx.amount),
      direction: tx.amount > 0 ? 'credit' : 'debit',
      description: tx.description,
      routeType: tx.route_type,
      createdAt: tx.created_at,
    }));

    const pending = pendingResult.data.map((tx) => ({
      id: tx.id,
      type: 'pending',
      amount: tx.amount,
      amountFormatted: IncreaseService.formatAmount(tx.amount),
      direction: tx.amount > 0 ? 'credit' : 'debit',
      description: tx.description,
      status: tx.status,
      routeType: tx.route_type,
      createdAt: tx.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: { transactions, pending },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
