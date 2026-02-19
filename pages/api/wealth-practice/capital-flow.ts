import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const [
      groupStats,
      graduatedGroups,
      landPoolStats,
      produceStats
    ] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*)::int as total_groups,
          COUNT(CASE WHEN graduated_at IS NOT NULL THEN 1 END)::int as graduated_groups,
          COALESCE(SUM(member_count), 0)::int as total_members,
          COALESCE(SUM(contribution_amount::numeric * member_count), 0)::numeric as estimated_capital_committed
        FROM susu_purpose_groups
      `),
      pool.query(`
        SELECT 
          id, display_name, contribution_amount, member_count, 
          graduated_to_pool_id, graduation_tx_hash, graduated_at
        FROM susu_purpose_groups 
        WHERE graduated_at IS NOT NULL 
        ORDER BY graduated_at DESC 
        LIMIT 10
      `),
      pool.query(`
        SELECT 
          COUNT(*)::int as total_pools,
          COALESCE(SUM(CASE WHEN status = 'active' OR status = 'funding' THEN 1 ELSE 0 END), 0)::int as active_pools,
          COALESCE(SUM(target_amount::numeric), 0)::numeric as total_target,
          COALESCE(SUM(total_contributed::numeric), 0)::numeric as total_contributed,
          COALESCE(SUM(member_count), 0)::int as total_pool_members
        FROM land_acquisition_pools
      `).catch((err) => { console.error('[capital-flow] land pools query failed:', err); return { rows: [{ total_pools: 0, active_pools: 0, total_target: 0, total_contributed: 0, total_pool_members: 0 }] }; }),
      pool.query(`
        SELECT 
          COUNT(*)::int as total_reservations,
          COUNT(CASE WHEN status = 'reserved' THEN 1 END)::int as reserved,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END)::int as confirmed,
          COUNT(CASE WHEN status = 'claimed' THEN 1 END)::int as claimed
        FROM produce_reservations
      `).catch((err) => { console.error('[capital-flow] produce reservations query failed:', err); return { rows: [{ total_reservations: 0, reserved: 0, confirmed: 0, claimed: 0 }] }; })
    ]);

    const gs = groupStats.rows[0];
    const lp = landPoolStats.rows[0];
    const ps = produceStats.rows[0];

    const capitalFlow = {
      groupEconomics: {
        totalGroups: gs.total_groups,
        graduatedGroups: gs.graduated_groups,
        totalMembers: gs.total_members,
        estimatedCapitalCommitted: parseFloat(gs.estimated_capital_committed) || 0,
        graduationRate: gs.total_groups > 0
          ? Math.round((gs.graduated_groups / gs.total_groups) * 100)
          : 0
      },
      landAcquisition: {
        totalPools: lp.total_pools,
        activePools: lp.active_pools,
        totalTarget: parseFloat(lp.total_target) || 0,
        totalContributed: parseFloat(lp.total_contributed) || 0,
        fundingProgress: lp.total_target > 0
          ? Math.round((parseFloat(lp.total_contributed) / parseFloat(lp.total_target)) * 100)
          : 0,
        totalPoolMembers: lp.total_pool_members
      },
      communityOutput: {
        totalReservations: ps.total_reservations,
        reserved: ps.reserved,
        confirmed: ps.confirmed,
        claimed: ps.claimed
      },
      recentGraduations: graduatedGroups.rows.map((g: any) => ({
        id: g.id,
        displayName: g.display_name,
        contributionAmount: parseFloat(g.contribution_amount) || 0,
        memberCount: g.member_count,
        poolId: g.graduated_to_pool_id,
        txHash: g.graduation_tx_hash,
        graduatedAt: g.graduated_at
      })),
      bridgeHealth: {
        groupsFormingPipeline: gs.total_groups - gs.graduated_groups,
        capitalInTransit: parseFloat(gs.estimated_capital_committed) || 0,
        landFundingGap: Math.max(0, (parseFloat(lp.total_target) || 0) - (parseFloat(lp.total_contributed) || 0)),
        produceDistributed: ps.claimed
      }
    };

    res.json({ success: true, capitalFlow });
  } catch (error: any) {
    console.error('Capital flow error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to compute capital flow' });
  }
}
