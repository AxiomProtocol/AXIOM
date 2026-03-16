import type { NextApiRequest, NextApiResponse } from 'next';
import { requireSiweSession } from '../../../../../lib/server/siweAuth';
import { getMemberAccount } from '../../../../../lib/server/integrations/bankingStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await requireSiweSession(req, res);
  if (!session) return;

  try {
    const accountId = String(req.query.id || '').trim();
    const account = await getMemberAccount(session.walletAddress);

    if (!account || account.unit_account_id !== accountId) {
      return res.status(403).json({ error: 'Account not accessible for this session.' });
    }

    const now = Date.now();
    const transactions = [
      {
        id: `txn_${Math.random().toString(36).slice(2, 10)}`,
        direction: 'credit',
        amountCents: Math.max(0, Number(account.balance_cents || 0)),
        description: 'Account Balance Snapshot',
        status: 'completed',
        date: new Date(now).toISOString(),
      },
    ];

    return res.status(200).json({ transactions });
  } catch (error: any) {
    console.error('Unit account transactions error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch account transactions' });
  }
}
