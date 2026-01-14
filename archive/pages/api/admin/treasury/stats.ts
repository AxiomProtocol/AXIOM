import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';
import { withAdminAuth, AuthenticatedRequest } from '../../../../lib/adminAuth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const client = await pool.connect();
    
    try {
      // Get revenue distribution stats
      const revenueStatsQuery = `
        SELECT 
          COUNT(*) as total_distributions,
          COALESCE(SUM(total_revenue::numeric), 0) as total_revenue,
          COALESCE(SUM(treasury_share::numeric), 0) as treasury_total,
          COALESCE(SUM(lessee_share::numeric), 0) as lessee_total,
          COALESCE(SUM(operator_share::numeric), 0) as operator_total
        FROM depin_revenue_distributions
      `;
      
      const revenueStats = await client.query(revenueStatsQuery);
      
      // Get recent distributions
      const recentDistributionsQuery = `
        SELECT 
          transaction_hash,
          total_revenue,
          treasury_share,
          distributed_at
        FROM depin_revenue_distributions
        ORDER BY distributed_at DESC
        LIMIT 10
      `;
      
      const recentDistributions = await client.query(recentDistributionsQuery);
      
      // Get node purchase events (from depin_events table)
      const purchaseStatsQuery = `
        SELECT 
          COUNT(*) as total_purchases,
          COALESCE(SUM(price_eth::numeric), 0) as total_eth_collected
        FROM depin_events
        WHERE event_type = 'node_minted'
      `;
      
      const purchaseStats = await client.query(purchaseStatsQuery);

      const stats = revenueStats.rows[0];
      const purchases = purchaseStats.rows[0];

      res.json({
        revenue: {
          totalDistributions: parseInt(stats.total_distributions) || 0,
          totalRevenue: stats.total_revenue || '0',
          treasuryShare: stats.treasury_total || '0',
          lesseeShare: stats.lessee_total || '0',
          operatorShare: stats.operator_total || '0',
          recentDistributions: recentDistributions.rows.map(row => ({
            txHash: row.transaction_hash,
            totalRevenue: row.total_revenue,
            treasuryShare: row.treasury_share,
            timestamp: row.distributed_at
          }))
        },
        purchases: {
          totalNodes: parseInt(purchases.total_purchases) || 0,
          totalEthCollected: purchases.total_eth_collected || '0'
        },
        timestamp: new Date().toISOString()
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching treasury stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch treasury stats', 
      error: error.message 
    });
  }
}

export default withAdminAuth(handler);
