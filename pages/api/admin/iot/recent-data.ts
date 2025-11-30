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
        SELECT * FROM iot_data_points
        ORDER BY recorded_at DESC
        LIMIT 50
      `);

      const dataPoints = result.rows.map(row => ({
        id: row.id,
        deviceId: row.device_id,
        dataType: row.data_type,
        value: row.value,
        unit: row.unit,
        rawData: row.raw_data,
        recordedAt: row.recorded_at,
        processedAt: row.processed_at
      }));

      res.json({ dataPoints });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching IoT data points:', error);
    res.status(500).json({ message: 'Failed to fetch data', error: error.message });
  }
}

export default withAdminAuth(handler);
