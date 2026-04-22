import type { NextApiRequest, NextApiResponse } from 'next';
import { listDeposits, type CardDepositIntent, type CardDepositStatus } from '../../../../../lib/capinfra/cardDeposits/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  const provided = req.headers['x-admin-key'];
  if (!adminKey) return res.status(503).json({ error: 'admin_key_not_configured' });
  if (provided !== adminKey) return res.status(401).json({ error: 'unauthorized' });

  try {
    const status = typeof req.query.status === 'string' ? req.query.status as CardDepositStatus : null;
    const intent = typeof req.query.intent === 'string' ? req.query.intent as CardDepositIntent : null;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const rows = await listDeposits({ status, intent, limit });
    return res.status(200).json({
      count: rows.length,
      deposits: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'list_failed', message: err?.message });
  }
}
