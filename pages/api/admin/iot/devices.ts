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
      const result = await client.query(`
        SELECT * FROM iot_device_streams
        ORDER BY last_data_at DESC NULLS LAST, created_at DESC
        LIMIT 100
      `);

      const devices = result.rows.map(row => ({
        id: row.id,
        deviceId: row.device_id,
        deviceType: row.device_type,
        nodeId: row.node_id,
        locationLat: row.location_lat,
        locationLng: row.location_lng,
        locationName: row.location_name,
        ownerAddress: row.owner_address,
        isActive: row.is_active,
        lastDataAt: row.last_data_at,
        dataPointCount: row.data_point_count,
        revenueGenerated: row.revenue_generated,
        metadata: row.metadata
      }));

      res.json({ devices });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching IoT devices:', error);
    res.status(500).json({ message: 'Failed to fetch devices', error: error.message });
  }
}

export default withAdminAuth(handler);
