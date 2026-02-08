import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  try {
    const graduatedResult = await pool.query(`
      SELECT 
        g.id,
        g.display_name as name,
        g.description,
        g.contribution_amount as "contributionAmount",
        g.member_count as "memberCount",
        g.graduated_to_pool_id as "graduatedPoolId",
        g.graduation_tx_hash as "graduationTxHash",
        g.graduated_at as "graduatedAt",
        c.charter_hash as "charterHash",
        c.mode,
        c.purpose,
        c.category,
        pc.name as "categoryName"
      FROM susu_purpose_groups g
      LEFT JOIN susu_charters c ON c.group_id = g.id
      LEFT JOIN susu_purpose_categories pc ON g.purpose_category_id = pc.id
      WHERE g.graduated_to_pool_id IS NOT NULL
      ORDER BY g.graduated_at DESC
      LIMIT 50
    `);

    const groups = graduatedResult.rows;

    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE graduated_to_pool_id IS NOT NULL) as "graduatedCount",
        COUNT(*) FILTER (WHERE graduated_to_pool_id IS NULL AND is_active = true) as "activeCount",
        COALESCE(SUM(contribution_amount) FILTER (WHERE graduated_to_pool_id IS NOT NULL), 0) as "totalCapitalMobilized"
      FROM susu_purpose_groups
    `);

    const stats = statsResult.rows[0] || {
      graduatedCount: 0,
      activeCount: 0,
      totalCapitalMobilized: 0
    };

    let userGroups: any[] = [];
    if (wallet && typeof wallet === 'string') {
      const userResult = await pool.query(`
        SELECT 
          g.id,
          g.display_name as name,
          g.graduated_to_pool_id as "graduatedPoolId",
          gm.role,
          c.mode
        FROM susu_group_members gm
        JOIN susu_purpose_groups g ON g.id = gm.group_id
        LEFT JOIN susu_charters c ON c.group_id = g.id
        JOIN users u ON u.id = gm.user_id
        WHERE LOWER(u.wallet_address) = $1
        ORDER BY g.graduated_at DESC NULLS LAST
      `, [wallet.toLowerCase()]);
      
      userGroups = userResult.rows;
    }

    const communityCount = groups.filter((g: any) => g.mode === 'community').length;
    const capitalCount = groups.filter((g: any) => g.mode === 'capital').length;

    res.status(200).json({
      success: true,
      stats: {
        graduatedGroups: parseInt(stats.graduatedCount) || 0,
        activeGroups: parseInt(stats.activeCount) || 0,
        totalCapitalMobilized: parseFloat(stats.totalCapitalMobilized) || 0,
        communityModeCount: communityCount,
        capitalModeCount: capitalCount
      },
      groups,
      userGroups,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Graduated groups error:', error);
    res.status(200).json({
      success: false,
      stats: { graduatedGroups: 0, activeGroups: 0, totalCapitalMobilized: 0, communityModeCount: 0, capitalModeCount: 0 },
      groups: [],
      userGroups: [],
      error: 'Failed to fetch graduated groups'
    });
  }
}
