import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'land_acquisition_pools'
      ) as exists
    `);

    if (!tableCheck.rows[0]?.exists) {
      return res.status(200).json({
        success: true,
        pools: [],
        total: 0,
      });
    }

    const result = await pool.query(`
      SELECT *
      FROM land_acquisition_pools
      ORDER BY created_at DESC
    `);

    const pools = result.rows.map((p: any) => {
      const targetAmount = parseFloat(p.target_amount) || 0;
      const totalContributed = parseFloat(p.total_contributed) || 0;
      const fundingProgress = targetAmount > 0
        ? Math.round((totalContributed / targetAmount) * 10000) / 100
        : 0;

      return {
        ...p,
        funding_progress: fundingProgress,
      };
    });

    return res.status(200).json({
      success: true,
      pools,
      total: pools.length,
    });
  } catch (error: any) {
    console.error('Acquisition pools fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch acquisition pools',
    });
  }
}
