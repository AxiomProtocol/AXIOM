import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from '../../../../lib/db';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ message: 'Address required' });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          l.*,
          n.node_tier as "nodeTier",
          n.node_type as "nodeType"
        FROM depin_node_listings l
        LEFT JOIN depin_nodes n ON l.node_id = n.node_id
        WHERE LOWER(l.owner_address) = LOWER($1)
        ORDER BY l.listed_at DESC
      `, [address]);

      const listings = result.rows.map(row => ({
        id: row.id,
        nodeId: row.node_id,
        ownerAddress: row.owner_address,
        monthlyRentAxm: row.monthly_rent_axm,
        minLeaseDays: row.min_lease_days,
        maxLeaseDays: row.max_lease_days,
        status: row.status,
        description: row.description,
        performanceScore: row.performance_score,
        totalLeases: row.total_leases,
        totalEarnings: row.total_earnings,
        listedAt: row.listed_at,
        nodeTier: row.nodeTier,
        nodeType: row.nodeType
      }));

      res.json({ listings });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching my listings:', error);
    res.status(500).json({ message: 'Failed to fetch listings', error: error.message });
  }
}
