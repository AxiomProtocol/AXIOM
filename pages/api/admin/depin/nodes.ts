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
    const { page = 1, limit = 50, status, nodeType, operator } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const client = await pool.connect();
    
    try {
      let whereClause = '';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (status) {
        whereClause += `${whereClause ? ' AND ' : 'WHERE '}status = $${paramIndex++}`;
        params.push(status);
      }
      
      if (nodeType !== undefined) {
        whereClause += `${whereClause ? ' AND ' : 'WHERE '}node_type = $${paramIndex++}`;
        params.push(Number(nodeType));
      }
      
      if (operator) {
        whereClause += `${whereClause ? ' AND ' : 'WHERE '}operator_address = $${paramIndex++}`;
        params.push((operator as string).toLowerCase());
      }
      
      const nodesQuery = `
        SELECT * FROM depin_nodes 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      params.push(Number(limit), offset);
      
      const nodesResult = await client.query(nodesQuery, params);
      const countResult = await client.query(`SELECT COUNT(*) as count FROM depin_nodes ${whereClause}`, params.slice(0, -2));
      
      const total = parseInt(countResult.rows[0]?.count) || 0;
      
      res.json({
        nodes: nodesResult.rows.map(row => ({
          id: row.id,
          nodeId: row.node_id,
          nodeType: row.node_type,
          nodeTier: row.node_tier,
          operatorAddress: row.operator_address,
          status: row.status,
          purchasePriceEth: row.purchase_price_eth,
          stakedAmountAxm: row.staked_amount_axm,
          totalRevenueGenerated: row.total_revenue_generated,
          totalUptime: row.total_uptime,
          totalDowntime: row.total_downtime,
          lastHealthCheck: row.last_health_check,
          registeredAt: row.registered_at,
          activatedAt: row.activated_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching DePIN nodes:', error);
    res.status(500).json({ message: 'Failed to fetch DePIN nodes', error: error.message });
  }
}

export default withAdminAuth(handler);
