import type { NextApiRequest, NextApiResponse } from 'next';
import { IncreaseService, getAccountId, IncreaseDisabledError } from '../../../lib/services/IncreaseService';

function checkAdminKey(req: NextApiRequest): boolean {
  return req.headers['x-admin-key'] === process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkAdminKey(req)) return res.status(401).json({ error: 'Unauthorized' });

  const AXIOM_ACCOUNT_ID = getAccountId();

  if (req.method === 'GET') {
    try {
      const result = await IncreaseService.listAccountNumbers(AXIOM_ACCOUNT_ID);
      return res.status(200).json({
        success: true,
        data: result.data.map((an) => ({
          id: an.id,
          accountNumber: an.account_number,
          routingNumber: an.routing_number,
          name: an.name,
          status: an.status,
          createdAt: an.created_at,
        })),
      });
    } catch (err: unknown) {
      if (err instanceof IncreaseDisabledError) {
        return res.status(err.status).json({ error: err.message, code: err.code });
      }
      return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (req.method === 'POST') {
    const { name, allow_ach_debits } = req.body as { name?: string; allow_ach_debits?: boolean };
    if (!name) return res.status(400).json({ error: 'name required' });

    try {
      const result = await IncreaseService.createAccountNumber({
        account_id: AXIOM_ACCOUNT_ID,
        name,
        inbound_ach: { debit_status: allow_ach_debits ? 'allowed' : 'blocked' },
        inbound_checks: { status: 'not_allowed' },
      });
      return res.status(200).json({
        success: true,
        data: {
          id: result.id,
          accountNumber: result.account_number,
          routingNumber: result.routing_number,
          name: result.name,
          status: result.status,
        },
      });
    } catch (err: unknown) {
      if (err instanceof IncreaseDisabledError) {
        return res.status(err.status).json({ error: err.message, code: err.code });
      }
      return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
