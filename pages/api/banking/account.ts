import type { NextApiRequest, NextApiResponse } from 'next';
import { IncreaseService, getAccountId, IncreaseDisabledError } from '../../../lib/services/IncreaseService';

function checkAdminKey(req: NextApiRequest): boolean {
  return req.headers['x-admin-key'] === process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const isAdmin = checkAdminKey(req);
  const AXIOM_ACCOUNT_ID = getAccountId();
  const accountId = (req.query.id as string) ?? AXIOM_ACCOUNT_ID;

  if (accountId !== AXIOM_ACCOUNT_ID && !isAdmin) {
    return res.status(403).json({ error: 'Access restricted to Axiom Nexus Account' });
  }

  try {
    const [account, balance] = await Promise.all([
      IncreaseService.getAccount(accountId),
      IncreaseService.getAccountBalance(accountId).catch(() => null),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        id: account.id,
        name: account.name,
        status: account.status,
        bank: account.bank,
        currency: account.currency,
        interestRate: account.interest_rate,
        programId: account.program_id,
        entityId: account.entity_id,
        createdAt: account.created_at,
        balance: balance
          ? {
              available: balance.available_balance,
              current: balance.current_balance,
              availableFormatted: IncreaseService.formatAmount(balance.available_balance),
              currentFormatted: IncreaseService.formatAmount(balance.current_balance),
            }
          : null,
        environment: process.env.INCREASE_ENVIRONMENT ?? 'sandbox',
      },
    });
  } catch (err: unknown) {
    if (err instanceof IncreaseDisabledError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
