import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        spg.id,
        spg.display_name as name,
        spg.member_count as members,
        spg.max_members,
        spg.is_active,
        spg.graduated_at,
        spg.contribution_amount,
        spc.name as purpose_category,
        sih.region_display as region
      FROM susu_purpose_groups spg
      LEFT JOIN susu_purpose_categories spc ON spg.purpose_category_id = spc.id
      LEFT JOIN susu_interest_hubs sih ON spg.hub_id = sih.id
      ORDER BY spg.member_count DESC, spg.created_at DESC
      LIMIT 50
    `);

    const groups = result.rows.map(g => {
      const memberCount = parseInt(g.members) || 0;
      const maxMembers = parseInt(g.max_members) || 12;
      
      let status: 'forming' | 'active' | 'graduated' = 'forming';
      if (g.graduated_at) {
        status = 'graduated';
      } else if (memberCount >= 3) {
        status = 'active';
      }

      const trustScore = Math.min(100, 50 + (memberCount * 5) + (g.is_active ? 10 : 0));

      return {
        id: g.id.toString(),
        name: g.name || `Purpose Group ${g.id}`,
        members: memberCount,
        maxMembers,
        completionRate: memberCount > 0 ? 100 : 0,
        avgPaymentTime: 'N/A',
        totalCycles: maxMembers,
        currentCycle: memberCount,
        status,
        trustScore,
        purpose: g.purpose_category || 'General',
        region: g.region || 'National',
        contribution: parseFloat(g.contribution_amount) || 0
      };
    });

    return res.status(200).json({
      success: true,
      groups,
      totalGroups: groups.length,
      activeGroups: groups.filter(g => g.status === 'active').length,
      formingGroups: groups.filter(g => g.status === 'forming').length
    });
  } catch (error: any) {
    console.error('Group analytics error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch group analytics'
    });
  }
}
