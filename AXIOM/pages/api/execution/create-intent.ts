import type { NextApiRequest, NextApiResponse } from 'next';
import { createIntent } from '../../../server/services/execution/intentService';

function isAuthorized(req: NextApiRequest): boolean {
  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  if (req.headers['x-admin-key'] === adminKey && adminKey) return true;
  if (!adminKey && process.env.NODE_ENV === 'development') return true;
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { userId, setupId, symbol, assetClass, direction, entryPrice, stopPrice, takeProfitPrice, invalidationPrice, isLive } = req.body;

  if (!userId || !setupId || !symbol || !assetClass || !direction || !entryPrice || !stopPrice) {
    return res.status(400).json({ error: 'Required fields: userId, setupId, symbol, assetClass, direction, entryPrice, stopPrice' });
  }

  if (!['LONG', 'SHORT'].includes(direction)) {
    return res.status(400).json({ error: 'direction must be LONG or SHORT' });
  }

  try {
    const result = await createIntent({
      userId, setupId, symbol, assetClass, direction,
      entryPrice: Number(entryPrice),
      stopPrice: Number(stopPrice),
      takeProfitPrice: takeProfitPrice ? Number(takeProfitPrice) : undefined,
      invalidationPrice: invalidationPrice ? Number(invalidationPrice) : undefined,
      isLive: isLive === true,
    });
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    console.error('[execution/create-intent] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
