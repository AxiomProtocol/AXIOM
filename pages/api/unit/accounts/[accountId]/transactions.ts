import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../../../lib/middleware/siweAuth';
import { unitAccountService } from '../../../../../lib/services/UnitAccountService';
import { rateLimitDefault } from '../../../../../lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!rateLimitDefault(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const { accountId } = req.query as { accountId: string };
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const offset = Number(req.query.offset ?? 0);

  const account = await unitAccountService.getAccountWithBalance(accountId);
  if (!account || account.walletAddress.toLowerCase() !== session.address.toLowerCase()) {
    return res.status(404).json({ error: 'Account not found.' });
  }

  const transactions = await unitAccountService.getTransactions(account.unitAccountId, limit);

  return res.status(200).json({ transactions, limit, offset });
}
