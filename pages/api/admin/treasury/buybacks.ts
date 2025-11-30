import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from '../../../../lib/db';
import { withAdminAuth, AuthenticatedRequest } from '../../../../lib/adminAuth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const client = await pool.connect();
    try {
      const [summaryResult, buybacksResult] = await Promise.all([
        client.query('SELECT * FROM treasury_burn_summary WHERE id = 1'),
        client.query(`
          SELECT * FROM treasury_buybacks
          ORDER BY executed_at DESC
          LIMIT 20
        `)
      ]);

      const summary = summaryResult.rows[0] || {
        total_eth_spent: '0',
        total_axm_bought: '0',
        total_axm_burned: '0',
        buyback_count: 0
      };

      const buybacks = buybacksResult.rows.map(row => ({
        id: row.id,
        transactionHash: row.transaction_hash,
        ethSpent: row.eth_spent,
        axmBought: row.axm_bought,
        axmBurned: row.axm_burned,
        averagePrice: row.average_price,
        sourceRevenue: row.source_revenue,
        executedAt: row.executed_at,
        burnTransactionHash: row.burn_transaction_hash,
        burnedAt: row.burned_at
      }));

      res.json({
        summary: {
          totalEthSpent: summary.total_eth_spent,
          totalAxmBought: summary.total_axm_bought,
          totalAxmBurned: summary.total_axm_burned,
          buybackCount: summary.buyback_count,
          lastBuybackDate: summary.last_buyback_date,
          lastBurnDate: summary.last_burn_date
        },
        buybacks
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching buyback data:', error);
    res.status(500).json({ message: 'Failed to fetch buyback data', error: error.message });
  }
}

export default withAdminAuth(handler);
