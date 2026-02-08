import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, description, type, walletAddress } = req.body;
  
  if (!name || !description || !walletAddress) {
    return res.status(400).json({ error: 'Name, description, and wallet address required' });
  }

  try {
    const userResult = await pool.query(
      `SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1)`,
      [walletAddress]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult.rows[0].id;

    const regionId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const result = await pool.query(
      `INSERT INTO susu_interest_hubs (
        region_id, region_display, region_type, description, 
        member_count, is_active, creator_id, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, 0, true, $5, NOW(), NOW())
       RETURNING id`,
      [regionId, name, type || 'interest', description, userId]
    );

    return res.status(200).json({
      success: true,
      hub: {
        id: result.rows[0].id.toString(),
        name,
        description,
        type,
      },
    });
  } catch (error: any) {
    console.error('Create hub error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'A hub with this name already exists' });
    }
    return res.status(500).json({ error: 'Failed to create hub' });
  }
}
