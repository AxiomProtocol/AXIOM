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
        u.id,
        u.first_name,
        u.last_name,
        u.username,
        u.bio,
        u.purpose_statement,
        u.occupation,
        u.location,
        u.profile_image_url,
        u.wallet_address,
        CASE WHEN u.show_email THEN u.email ELSE NULL END as email,
        CASE WHEN u.show_phone THEN u.phone ELSE NULL END as phone,
        CASE WHEN u.show_whatsapp THEN u.whatsapp ELSE NULL END as whatsapp,
        gm.role,
        gm.joined_at
      FROM susu_group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = $1
      ORDER BY 
        CASE WHEN gm.role = 'organizer' THEN 0 
             ELSE 1 END,
        gm.joined_at ASC`,
      [groupId]
    );

    res.status(200).json({ 
      success: true, 
      members: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch members' });
  }
}
