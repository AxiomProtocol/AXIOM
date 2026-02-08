import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { ethers } from 'ethers';
import { REAL_ESTATE_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const CAPITAL_POOLS_ABI = [
  "function getTotalValueLocked() external view returns (uint256)",
  "function getPoolCount() external view returns (uint256)"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const graduatedStats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE graduated_to_pool_id IS NOT NULL) as graduated_count,
        COUNT(*) FILTER (WHERE is_active = true AND graduated_to_pool_id IS NULL) as active_count,
        COALESCE(SUM(contribution_amount * member_count) FILTER (WHERE graduated_to_pool_id IS NOT NULL), 0) as total_capital_graduated,
        COALESCE(SUM(contribution_amount * member_count) FILTER (WHERE is_active = true), 0) as total_capital_active,
        COALESCE(AVG(member_count) FILTER (WHERE graduated_to_pool_id IS NOT NULL), 0) as avg_members_at_graduation
      FROM susu_purpose_groups
    `);

    const graduatedGroups = await pool.query(`
      SELECT 
        g.id,
        g.display_name as name,
        g.contribution_amount,
        g.member_count,
        g.graduated_at,
        g.graduated_to_pool_id as pool_id,
        g.graduation_tx_hash as tx_hash,
        c.mode,
        c.charter_hash,
        pc.name as category_name,
        h.region_display as hub_name
      FROM susu_purpose_groups g
      LEFT JOIN susu_charters c ON c.group_id = g.id
      LEFT JOIN susu_purpose_categories pc ON pc.id = g.purpose_category_id
      LEFT JOIN susu_interest_hubs h ON h.id = g.hub_id
      WHERE g.graduated_to_pool_id IS NOT NULL
      ORDER BY g.graduated_at DESC
      LIMIT 20
    `);

    const monthlyStats = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as groups_created,
        COUNT(*) FILTER (WHERE graduated_to_pool_id IS NOT NULL) as groups_graduated,
        COALESCE(SUM(contribution_amount * member_count), 0) as capital_committed
      FROM susu_purpose_groups
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `);

    const categoryBreakdown = await pool.query(`
      SELECT 
        COALESCE(pc.name, 'General') as category,
        COUNT(*) as total_groups,
        COUNT(*) FILTER (WHERE g.graduated_to_pool_id IS NOT NULL) as graduated_groups,
        COALESCE(SUM(g.contribution_amount * g.member_count), 0) as total_capital
      FROM susu_purpose_groups g
      LEFT JOIN susu_purpose_categories pc ON pc.id = g.purpose_category_id
      GROUP BY pc.name
      ORDER BY total_capital DESC
      LIMIT 10
    `);

    const modeDistribution = await pool.query(`
      SELECT 
        CASE WHEN c.mode IS NULL THEN 'community' ELSE c.mode::text END as mode,
        COUNT(*) as count
      FROM susu_purpose_groups g
      LEFT JOIN susu_charters c ON c.group_id = g.id
      WHERE g.graduated_to_pool_id IS NOT NULL
      GROUP BY CASE WHEN c.mode IS NULL THEN 'community' ELSE c.mode::text END
    `);

    let onChainStats = {
      totalValueLocked: '0',
      poolCount: 0
    };

    try {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const contract = new ethers.Contract(
        REAL_ESTATE_CONTRACTS.CAPITAL_POOLS,
        CAPITAL_POOLS_ABI,
        provider
      );

      const [tvl, poolCount] = await Promise.all([
        contract.getTotalValueLocked().catch(() => BigInt(0)),
        contract.getPoolCount().catch(() => BigInt(0))
      ]);

      onChainStats = {
        totalValueLocked: ethers.formatEther(tvl),
        poolCount: Number(poolCount)
      };
    } catch (e) {
      console.log('Could not fetch on-chain stats');
    }

    const stats = graduatedStats.rows[0] || {};

    const communityModeCount = modeDistribution.rows.find((r: any) => r.mode === 'community')?.count || 0;
    const capitalModeCount = modeDistribution.rows.find((r: any) => r.mode === 'capital')?.count || 0;

    res.status(200).json({
      success: true,
      report: {
        generatedAt: new Date().toISOString(),
        summary: {
          totalGroupsGraduated: parseInt(stats.graduated_count) || 0,
          totalActiveGroups: parseInt(stats.active_count) || 0,
          totalCapitalGraduated: parseFloat(stats.total_capital_graduated) || 0,
          totalCapitalActive: parseFloat(stats.total_capital_active) || 0,
          avgMembersAtGraduation: parseFloat(stats.avg_members_at_graduation) || 0,
          communityModeCount: parseInt(communityModeCount) || 0,
          capitalModeCount: parseInt(capitalModeCount) || 0
        },
        onChain: onChainStats,
        graduatedGroups: graduatedGroups.rows.map((g: any) => ({
          id: g.id,
          name: g.name,
          contributionAmount: parseFloat(g.contribution_amount) || 0,
          memberCount: g.member_count || 0,
          totalCapital: (parseFloat(g.contribution_amount) || 0) * (g.member_count || 0),
          graduatedAt: g.graduated_at,
          poolId: g.pool_id,
          txHash: g.tx_hash,
          mode: g.mode || 'community',
          charterHash: g.charter_hash,
          category: g.category_name || 'General',
          hub: g.hub_name
        })),
        monthlyTrends: monthlyStats.rows.map((m: any) => ({
          month: m.month,
          groupsCreated: parseInt(m.groups_created) || 0,
          groupsGraduated: parseInt(m.groups_graduated) || 0,
          capitalCommitted: parseFloat(m.capital_committed) || 0
        })),
        categoryBreakdown: categoryBreakdown.rows.map((c: any) => ({
          category: c.category,
          totalGroups: parseInt(c.total_groups) || 0,
          graduatedGroups: parseInt(c.graduated_groups) || 0,
          totalCapital: parseFloat(c.total_capital) || 0,
          graduationRate: c.total_groups > 0 ? Math.round((c.graduated_groups / c.total_groups) * 100) : 0
        })),
        contractAddress: REAL_ESTATE_CONTRACTS.CAPITAL_POOLS
      }
    });
  } catch (error: any) {
    console.error('Transparency report error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate transparency report' 
    });
  }
}
