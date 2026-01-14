import type { NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';
import { withAdminAuth, AuthenticatedRequest } from '../../../../lib/adminAuth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { page = 1, limit = 50, eventType, nodeId, address } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const client = await pool.connect();
    
    try {
      let whereClause = '';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (eventType) {
        whereClause += `${whereClause ? ' AND ' : 'WHERE '}event_type = $${paramIndex++}`;
        params.push(eventType);
      }
      
      if (nodeId) {
        whereClause += `${whereClause ? ' AND ' : 'WHERE '}node_id = $${paramIndex++}`;
        params.push(Number(nodeId));
      }
      
      if (address) {
        whereClause += `${whereClause ? ' AND ' : 'WHERE '}(operator_address = $${paramIndex} OR buyer_address = $${paramIndex++})`;
        params.push((address as string).toLowerCase());
      }
      
      const eventsQuery = `
        SELECT * FROM depin_events 
        ${whereClause}
        ORDER BY processed_at DESC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      params.push(Number(limit), offset);
      
      const eventsResult = await client.query(eventsQuery, params);
      const countResult = await client.query(`SELECT COUNT(*) as count FROM depin_events ${whereClause}`, params.slice(0, -2));
      
      const total = parseInt(countResult.rows[0]?.count) || 0;
      
      res.json({
        events: eventsResult.rows.map(row => ({
          id: row.id,
          eventType: row.event_type,
          transactionHash: row.transaction_hash,
          blockNumber: row.block_number,
          logIndex: row.log_index,
          contractAddress: row.contract_address,
          nodeId: row.node_id,
          nodeType: row.node_type,
          operatorAddress: row.operator_address,
          buyerAddress: row.buyer_address,
          tier: row.tier,
          priceEth: row.price_eth,
          priceAxm: row.price_axm,
          metadata: row.metadata,
          processedAt: row.processed_at,
          blockTimestamp: row.block_timestamp
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
    console.error('Error fetching DePIN events:', error);
    res.status(500).json({ message: 'Failed to fetch DePIN events', error: error.message });
  }
}

export default withAdminAuth(handler);
