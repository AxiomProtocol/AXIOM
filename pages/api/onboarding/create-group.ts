import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { hubId, categoryId, groupName, description, contributionAmount, cycleLengthDays, walletAddress } = req.body;

    if (!hubId || !categoryId || !groupName) {
      return res.status(400).json({ success: false, error: 'Hub, category, and group name are required' });
    }

    const result = await pool.query(`
      INSERT INTO susu_purpose_groups 
        (hub_id, purpose_category_id, display_name, description, contribution_amount, 
         contribution_currency, cycle_length_days, member_count, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, 'USD', $6, 1, true, NOW())
      RETURNING id, display_name
    `, [
      hubId,
      categoryId,
      groupName,
      description || '',
      contributionAmount || '100',
      cycleLengthDays || 30,
    ]);

    if (result.rows.length > 0) {
      const newGroup = result.rows[0];

      if (walletAddress) {
        await pool.query(`
          INSERT INTO susu_group_members (group_id, wallet_address, role, joined_at)
          VALUES ($1, $2, 'organizer', NOW())
          ON CONFLICT DO NOTHING
        `, [newGroup.id, walletAddress]);
      }

      return res.json({
        success: true,
        group: {
          id: newGroup.id,
          name: newGroup.display_name,
        },
        message: 'Purpose Group created successfully! You are now the organizer.',
      });
    }

    return res.status(500).json({ success: false, error: 'Failed to create group' });
  } catch (error) {
    console.error('Create group error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create group' });
  }
}
