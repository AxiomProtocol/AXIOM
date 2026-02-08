import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { sessionId, mode, walletAddress, hubId } = req.body;

    if (hubId) {
      const groupsResult = await pool.query(`
        SELECT g.id, g.display_name, g.description, g.contribution_amount, 
               g.member_count, g.max_members, g.min_members_to_activate,
               c.name as category_name, c.icon
        FROM susu_purpose_groups g
        LEFT JOIN susu_purpose_categories c ON g.purpose_category_id = c.id
        WHERE g.hub_id = $1 AND g.is_active = true
        ORDER BY g.member_count DESC
      `, [hubId]);

      const categoriesResult = await pool.query(`
        SELECT id, name, description, icon FROM susu_purpose_categories 
        WHERE is_active = true ORDER BY sort_order
      `);

      const groups = groupsResult.rows.map(g => ({
        id: g.id,
        name: g.display_name || `${g.category_name} Circle`,
        description: g.description,
        contributionAmount: g.contribution_amount ? `$${g.contribution_amount}/month` : 'Flexible',
        members: g.member_count || 0,
        maxMembers: g.max_members || 50,
        minMembers: g.min_members_to_activate || 3,
        category: g.category_name,
        icon: g.icon,
        spotsLeft: (g.max_members || 50) - (g.member_count || 0),
      }));

      const categories = categoriesResult.rows.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        icon: c.icon,
      }));

      return res.json({
        success: true,
        groups,
        categories,
        hubId,
        canCreateGroup: true,
      });
    }

    const hubsResult = await pool.query(`
      SELECT id, region_id, region_display, description, cover_image_url, member_count, region_type
      FROM susu_interest_hubs
      WHERE is_active = true
      ORDER BY member_count DESC
    `);

    if (hubsResult.rows.length > 0) {
      const hubs = hubsResult.rows.map(h => ({
        id: h.id,
        regionId: h.region_id,
        name: h.region_display,
        description: h.description,
        coverImage: h.cover_image_url,
        memberCount: h.member_count || 0,
        regionType: h.region_type,
      }));

      return res.json({
        success: true,
        hubs,
        step: 'select_hub',
      });
    }

    const defaultHubs = [
      { id: 1, name: 'Atlanta Metro', description: 'Building wealth together in the ATL', memberCount: 47, regionType: 'metro' },
      { id: 2, name: 'Houston Area', description: 'Texas-sized savings goals', memberCount: 32, regionType: 'metro' },
      { id: 3, name: 'Chicago Region', description: 'Midwest wealth builders', memberCount: 28, regionType: 'metro' },
      { id: 4, name: 'Los Angeles', description: 'West coast wealth community', memberCount: 41, regionType: 'metro' },
      { id: 5, name: 'New York Metro', description: 'East coast financial empowerment', memberCount: 63, regionType: 'metro' },
      { id: 6, name: 'Miami-Dade', description: 'Sunshine State savings', memberCount: 25, regionType: 'metro' },
      { id: 7, name: 'Dallas-Fort Worth', description: 'North Texas builders', memberCount: 22, regionType: 'metro' },
      { id: 8, name: 'National Community', description: 'Connect with members nationwide', memberCount: 156, regionType: 'country' },
    ];

    return res.json({
      success: true,
      hubs: defaultHubs,
      step: 'select_hub',
      isDefault: true,
    });
  } catch (error) {
    console.error('Circle matching error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load data' });
  }
}
