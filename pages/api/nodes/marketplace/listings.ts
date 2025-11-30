import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from '../../../../lib/db';
import { verifySIWEAddress } from '../../../../lib/middleware/siweAuth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
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
        WHERE l.status = 'available'
        ORDER BY l.listed_at DESC
        LIMIT 50
      `);

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
    console.error('Error fetching marketplace listings:', error);
    res.status(500).json({ message: 'Failed to fetch listings', error: error.message });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { nodeId, ownerAddress, monthlyRentAxm, minLeaseDays, maxLeaseDays, description } = req.body;

    // Validate required fields (nodeId can be 0, so check for undefined/null)
    if (nodeId === undefined || nodeId === null || !ownerAddress || !monthlyRentAxm) {
      return res.status(400).json({ error: 'Missing required fields: nodeId, ownerAddress, monthlyRentAxm' });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(ownerAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Verify SIWE authentication - ensure wallet ownership
    const siweVerification = await verifySIWEAddress(req);
    if (!siweVerification.valid) {
      return res.status(401).json({ 
        error: siweVerification.error,
        code: 'SIWE_VERIFICATION_FAILED',
        authenticatedAddress: siweVerification.authenticatedAddress
      });
    }

    // Validate numeric fields
    const parsedNodeId = parseInt(nodeId);
    const parsedRent = parseFloat(monthlyRentAxm);
    const parsedMinDays = parseInt(minLeaseDays) || 30;
    const parsedMaxDays = parseInt(maxLeaseDays) || 365;

    if (isNaN(parsedNodeId) || parsedNodeId < 0) {
      return res.status(400).json({ error: 'Invalid node ID - must be a non-negative number' });
    }

    if (isNaN(parsedRent) || parsedRent <= 0 || parsedRent > 1000000000) {
      return res.status(400).json({ error: 'Invalid monthly rent - must be a positive number up to 1 billion AXM' });
    }

    if (parsedMinDays < 1 || parsedMinDays > 3650) {
      return res.status(400).json({ error: 'Minimum lease days must be between 1 and 3650' });
    }

    if (parsedMaxDays < parsedMinDays || parsedMaxDays > 3650) {
      return res.status(400).json({ error: 'Maximum lease days must be between minimum and 3650' });
    }

    // Sanitize description
    const sanitizedDescription = (description || '').slice(0, 1000).replace(/<[^>]*>/g, '');

    const client = await pool.connect();
    try {
      // Check for existing listing
      const existingListing = await client.query(
        `SELECT id FROM depin_node_listings WHERE node_id = $1 AND status = 'available'`,
        [parsedNodeId]
      );

      if (existingListing.rows.length > 0) {
        return res.status(400).json({ error: 'This node is already listed' });
      }

      const result = await client.query(`
        INSERT INTO depin_node_listings (
          node_id, owner_address, monthly_rent_axm, min_lease_days, max_lease_days, 
          status, description, performance_score, total_leases, total_earnings, listed_at
        ) VALUES ($1, $2, $3, $4, $5, 'available', $6, '95.0', 0, '0', NOW())
        RETURNING *
      `, [parsedNodeId, ownerAddress.toLowerCase(), parsedRent.toFixed(2), parsedMinDays, parsedMaxDays, sanitizedDescription]);

      res.status(201).json({ 
        success: true, 
        listing: {
          id: result.rows[0].id,
          nodeId: result.rows[0].node_id,
          ownerAddress: result.rows[0].owner_address,
          monthlyRentAxm: result.rows[0].monthly_rent_axm,
          status: result.rows[0].status
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error creating listing:', error);
    res.status(500).json({ error: 'Failed to create listing. Please try again.' });
  }
}
