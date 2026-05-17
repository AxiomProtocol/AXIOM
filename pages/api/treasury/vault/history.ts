import type { NextApiRequest, NextApiResponse } from 'next';
import { getVaultEventHistory } from '../../../../lib/treasury/vault/vaultService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const limit  = Math.min(parseInt(String(req.query.limit  ?? '50'),  10), 200);
  const offset = Math.max(parseInt(String(req.query.offset ?? '0'),   10), 0);

  try {
    const events = await getVaultEventHistory(limit, offset);
    return res.status(200).json({
      success: true,
      data: events.map((e) => ({
        id:          e.id,
        eventType:   e.eventType,
        strategy:    e.strategy,
        amountUsd:   parseFloat(String(e.amountUsd)),
        txHash:      e.txHash,
        blockNumber: e.blockNumber,
        createdAt:   e.createdAt?.toISOString() ?? null,
      })),
      meta: { limit, offset },
    });
  } catch (err: any) {
    console.error('[api/treasury/vault/history]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch vault history' });
  }
}
