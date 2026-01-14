import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;

  if (req.method === 'GET') {
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ message: 'Address required' });
    }

    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT * FROM dex_limit_orders
          WHERE LOWER(trader_address) = LOWER($1)
          ORDER BY created_at DESC
          LIMIT 50
        `, [address]);

        const orders = result.rows.map(row => ({
          id: row.id,
          orderHash: row.order_hash,
          tokenIn: row.token_in,
          tokenOut: row.token_out,
          amountIn: row.amount_in,
          amountOut: row.amount_out,
          limitPrice: row.limit_price,
          filledAmount: row.filled_amount,
          side: row.side,
          status: row.status,
          expiresAt: row.expires_at,
          createdAt: row.created_at,
          filledAt: row.filled_at,
          cancelledAt: row.cancelled_at
        }));

        const openOrders = orders.filter(o => o.status === 'open' || o.status === 'partial');
        const filledOrders = orders.filter(o => o.status === 'filled');

        res.json({
          orders,
          summary: {
            openCount: openOrders.length,
            filledCount: filledOrders.length,
            totalOrders: orders.length
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Error fetching limit orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
    }
  } else if (req.method === 'POST') {
    const { traderAddress, tokenIn, tokenOut, amountIn, amountOut, limitPrice, side, expiresAt } = req.body;

    if (!traderAddress || !tokenIn || !tokenOut || !amountIn || !amountOut || !limitPrice || !side) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
      const client = await pool.connect();
      try {
        const orderHash = `0x${Buffer.from(Date.now().toString()).toString('hex').padEnd(64, '0')}`;
        
        const result = await client.query(`
          INSERT INTO dex_limit_orders 
          (order_hash, trader_address, token_in, token_out, amount_in, amount_out, limit_price, side, expires_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [orderHash, traderAddress, tokenIn, tokenOut, amountIn, amountOut, limitPrice, side, expiresAt]);

        res.json({ order: result.rows[0], message: 'Order created successfully' });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Error creating limit order:', error);
      res.status(500).json({ message: 'Failed to create order', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
