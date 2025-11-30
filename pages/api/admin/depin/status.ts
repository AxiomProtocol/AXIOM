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
    const client = await pool.connect();
    
    try {
      const eventsResult = await client.query('SELECT COUNT(*) as count FROM depin_events');
      const nodesResult = await client.query('SELECT COUNT(*) as count FROM depin_nodes');
      const activeNodesResult = await client.query("SELECT COUNT(*) as count FROM depin_nodes WHERE status = 'active'");
      const mintedResult = await client.query("SELECT COUNT(*) as count FROM depin_events WHERE event_type = 'node_minted'");
      const registeredResult = await client.query("SELECT COUNT(*) as count FROM depin_events WHERE event_type = 'node_registered'");
      const revenueResult = await client.query('SELECT COUNT(*) as count FROM depin_revenue_distributions');
      const syncResult = await client.query('SELECT * FROM depin_sync_state LIMIT 1');

      const syncState = syncResult.rows[0] || null;

      res.json({
        listener: {
          isRunning: syncState?.is_listening || false,
          lastProcessedBlock: syncState?.last_processed_block || 0,
          errorCount: syncState?.error_count || 0
        },
        stats: {
          totalEvents: parseInt(eventsResult.rows[0]?.count) || 0,
          nodesMinted: parseInt(mintedResult.rows[0]?.count) || 0,
          nodesRegistered: parseInt(registeredResult.rows[0]?.count) || 0,
          revenueDistributed: parseInt(revenueResult.rows[0]?.count) || 0,
          totalNodes: parseInt(nodesResult.rows[0]?.count) || 0,
          activeNodes: parseInt(activeNodesResult.rows[0]?.count) || 0
        },
        syncState
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching DePIN status:', error);
    res.status(500).json({ message: 'Failed to fetch DePIN status', error: error.message });
  }
}

export default withAdminAuth(handler);
