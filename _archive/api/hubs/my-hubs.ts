import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  try {
    const userResult = await pool.query(
      `SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1)`,
      [address]
    );

    if (userResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        hubs: [],
      });
    }

    const userId = userResult.rows[0].id;

    const hubsResult = await pool.query(
      `SELECT 
        sih.id,
        sih.region_display as name,
        sih.description,
        sih.member_count,
        sih.is_active,
        sih.created_at,
        (SELECT COUNT(*) FROM susu_groups sg WHERE sg.interest_hub_id = sih.id) as group_count
       FROM susu_interest_hubs sih
       WHERE sih.creator_id = $1
       ORDER BY sih.created_at DESC`,
      [userId]
    );

    const hubs = hubsResult.rows.map(row => ({
      id: row.id.toString(),
      name: row.name || 'Unnamed Hub',
      description: row.description || '',
      memberCount: parseInt(row.member_count || '0'),
      groupCount: parseInt(row.group_count || '0'),
      status: row.is_active ? 'active' : 'pending',
      createdAt: row.created_at,
    }));

    return res.status(200).json({
      success: true,
      hubs,
    });
  } catch (error) {
    console.error('My hubs error:', error);
    return res.status(500).json({ error: 'Failed to fetch hubs' });
  }
}
