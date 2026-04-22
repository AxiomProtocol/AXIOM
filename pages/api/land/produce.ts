import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const reservationsResult = await pool.query(`
      SELECT *
      FROM produce_reservations
      ORDER BY created_at DESC
    `);

    const statsResult = await pool.query(`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'reserved')::int as reserved,
        COUNT(*) FILTER (WHERE status = 'confirmed')::int as confirmed,
        COUNT(*) FILTER (WHERE status = 'claimed')::int as claimed
      FROM produce_reservations
    `);

    const stats = statsResult.rows[0] || { total: 0, reserved: 0, confirmed: 0, claimed: 0 };

    return res.status(200).json({
      success: true,
      stats: {
        total: stats.total,
        reserved: stats.reserved,
        confirmed: stats.confirmed,
        claimed: stats.claimed,
      },
      reservations: reservationsResult.rows,
    });
  } catch (error: any) {
    console.error('Produce reservations fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch produce reservations',
      details: error.message,
    });
  }
}
