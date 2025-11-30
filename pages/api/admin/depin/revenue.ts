import type { NextApiResponse } from 'next';
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
    const { page = 1, limit = 50, nodeId, leaseId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const client = await pool.connect();
    
    try {
      let whereClause = '';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (nodeId) {
        whereClause += `${whereClause ? ' AND ' : 'WHERE '}node_id = $${paramIndex++}`;
        params.push(Number(nodeId));
      }
      
      if (leaseId) {
        whereClause += `${whereClause ? ' AND ' : 'WHERE '}lease_id = $${paramIndex++}`;
        params.push(Number(leaseId));
      }
      
      const revenueQuery = `
        SELECT * FROM depin_revenue_distributions 
        ${whereClause}
        ORDER BY processed_at DESC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      params.push(Number(limit), offset);
      
      const revenueResult = await client.query(revenueQuery, params);
      
      const summaryResult = await client.query(`
        SELECT 
          COALESCE(SUM(total_revenue::numeric), 0) as total,
          COALESCE(SUM(lessee_share::numeric), 0) as lessee_total,
          COALESCE(SUM(operator_share::numeric), 0) as operator_total,
          COALESCE(SUM(treasury_share::numeric), 0) as treasury_total
        FROM depin_revenue_distributions
      `);
      
      const summary = summaryResult.rows[0];
      
      res.json({
        distributions: revenueResult.rows.map(row => ({
          id: row.id,
          transactionHash: row.transaction_hash,
          blockNumber: row.block_number,
          leaseId: row.lease_id,
          nodeId: row.node_id,
          totalRevenue: row.total_revenue,
          lesseeShare: row.lessee_share,
          lesseeAddress: row.lessee_address,
          operatorShare: row.operator_share,
          operatorAddress: row.operator_address,
          treasuryShare: row.treasury_share,
          distributedAt: row.distributed_at,
          processedAt: row.processed_at
        })),
        summary: {
          totalRevenue: summary?.total || '0',
          lesseeTotal: summary?.lessee_total || '0',
          operatorTotal: summary?.operator_total || '0',
          treasuryTotal: summary?.treasury_total || '0'
        },
        pagination: {
          page: Number(page),
          limit: Number(limit)
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching DePIN revenue:', error);
    res.status(500).json({ message: 'Failed to fetch revenue distributions', error: error.message });
  }
}

export default withAdminAuth(handler);
