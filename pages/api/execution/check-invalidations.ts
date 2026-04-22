import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

function isAuthorized(req: NextApiRequest): boolean {
  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  if (req.headers['x-admin-key'] === adminKey && adminKey) return true;
  if (!adminKey && process.env.NODE_ENV === 'development') return true;
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const openPositions = await pool.query(
      `SELECT e.execution_id, e.filled_price, e.filled_qty, e.opened_at,
              i.intent_id, i.user_id, i.symbol, i.asset_class, i.direction,
              i.stop_price, i.take_profit_price, i.invalidation_price, i.is_live
       FROM gef_executions e
       JOIN gef_execution_intents i ON e.intent_id = i.intent_id
       WHERE i.status = 'OPEN' AND e.closed_at IS NULL
       ORDER BY e.opened_at ASC`
    );

    const positions = openPositions.rows.map((pos: any) => {
      const entry = parseFloat(pos.filled_price);
      const stop = pos.stop_price ? parseFloat(pos.stop_price) : null;
      const tp = pos.take_profit_price ? parseFloat(pos.take_profit_price) : null;
      const inv = pos.invalidation_price ? parseFloat(pos.invalidation_price) : null;

      return {
        executionId: pos.execution_id,
        intentId: pos.intent_id,
        userId: pos.user_id,
        symbol: pos.symbol,
        assetClass: pos.asset_class,
        direction: pos.direction,
        entryPrice: entry,
        filledQty: parseFloat(pos.filled_qty),
        stopPrice: stop,
        takeProfitPrice: tp,
        invalidationPrice: inv,
        isLive: pos.is_live,
        openedAt: pos.opened_at,
        requiresPriceCheck: true,
      };
    });

    return res.status(200).json({
      openPositionCount: positions.length,
      positions,
      note: 'Price checks must be performed externally. This endpoint provides the list of positions requiring invalidation monitoring.',
    });
  } catch (err: any) {
    console.error('[execution/check-invalidations] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
