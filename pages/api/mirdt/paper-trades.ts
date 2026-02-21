import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { setupId } = req.query;

      if (!setupId || typeof setupId !== 'string') {
        return res.status(400).json({ success: false, error: 'setupId query parameter is required' });
      }

      const result = await pool.query(
        `SELECT * FROM mirdt_paper_trades WHERE setup_id = $1 ORDER BY opened_at DESC`,
        [setupId]
      );

      return res.status(200).json({ success: true, trades: result.rows });
    }

    if (req.method === 'POST') {
      const { setupId, entryPrice, quantity, notes } = req.body;

      if (!setupId || !entryPrice || !quantity) {
        return res.status(400).json({ success: false, error: 'setupId, entryPrice, and quantity are required' });
      }

      const setupCheck = await pool.query(
        `SELECT id FROM mirdt_setups WHERE id = $1 LIMIT 1`,
        [setupId]
      );

      if (setupCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Setup not found' });
      }

      const result = await pool.query(
        `INSERT INTO mirdt_paper_trades (id, setup_id, opened_at, entry_price, quantity, notes)
         VALUES (gen_random_uuid(), $1, NOW(), $2, $3, $4)
         RETURNING *`,
        [setupId, entryPrice, quantity, notes || null]
      );

      return res.status(201).json({ success: true, trade: result.rows[0] });
    }

    if (req.method === 'PUT') {
      const { id, exitPrice, notes } = req.body;

      if (!id || !exitPrice) {
        return res.status(400).json({ success: false, error: 'id and exitPrice are required' });
      }

      const existing = await pool.query(
        `SELECT * FROM mirdt_paper_trades WHERE id = $1 LIMIT 1`,
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Paper trade not found' });
      }

      const trade = existing.rows[0];
      if (trade.closed_at) {
        return res.status(400).json({ success: false, error: 'Trade is already closed' });
      }

      const entry = parseFloat(trade.entry_price);
      const exit = parseFloat(exitPrice);
      const qty = parseFloat(trade.quantity);

      if (isNaN(entry) || isNaN(exit) || isNaN(qty) || entry <= 0 || qty <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid numeric values for entry, exit, or quantity' });
      }

      const direction = trade.direction || 'LONG';
      const rawPnl = direction === 'LONG'
        ? (exit - entry) * qty
        : (entry - exit) * qty;
      const rawPnlPct = direction === 'LONG'
        ? ((exit - entry) / entry) * 100
        : ((entry - exit) / entry) * 100;

      let outcome: string;
      if (rawPnl > 0) outcome = 'WIN';
      else if (rawPnl < 0) outcome = 'LOSS';
      else outcome = 'FLAT';

      const result = await pool.query(
        `UPDATE mirdt_paper_trades
         SET exit_price = $1, pnl = $2, pnl_pct = $3, outcome = $4, closed_at = NOW(), status = 'CLOSED', notes = $5
         WHERE id = $6 AND closed_at IS NULL
         RETURNING *`,
        [exit, rawPnl, rawPnlPct, outcome, notes !== undefined ? notes : trade.notes, id]
      );

      if (result.rows.length === 0) {
        return res.status(409).json({ success: false, error: 'Trade was already closed (concurrent close detected)' });
      }

      return res.status(200).json({ success: true, trade: result.rows[0] });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[paper-trades] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
