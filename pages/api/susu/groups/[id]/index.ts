import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const groupId = parseInt(id as string);

    const result = await pool.query(
      `SELECT 
        g.id,
        g.name,
        g.description,
        g.purpose_category_id,
        g.hub_id,
        h.name as hub_name,
        h.region as hub_region,
        pc.name as category_name,
        g.contribution_amount,
        g.currency,
        g.cycle_duration,
        g.member_count,
        g.max_members,
        g.min_members_to_activate,
        g.is_active,
        g.graduated_to_pool_id,
        g.created_at,
        g.updated_at
      FROM susu_purpose_groups g
      LEFT JOIN susu_interest_hubs h ON h.id = g.hub_id
      LEFT JOIN susu_purpose_categories pc ON pc.id = g.purpose_category_id
      WHERE g.id = $1
      LIMIT 1`,
      [groupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.status(200).json({ 
      success: true, 
      group: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch group' });
  }
}
