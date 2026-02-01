import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const groupId = parseInt(id as string);

    const groupResult = await pool.query(
      `SELECT g.*, pc.name as purpose_name, pc.icon as purpose_icon,
              h.region_display as hub_name
       FROM susu_purpose_groups g
       LEFT JOIN susu_purpose_categories pc ON pc.id = g.purpose_category_id
       LEFT JOIN susu_interest_hubs h ON h.id = g.hub_id
       WHERE g.id = $1`,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupResult.rows[0];

    const membersResult = await pool.query(
      `SELECT gm.*, u.wallet_address, u.first_name, u.last_name, u.username,
              rp.reliability_score, rp.on_time_contributions, rp.total_contributions
       FROM susu_group_members gm
       LEFT JOIN users u ON u.id = gm.user_id
       LEFT JOIN susu_reliability_profiles rp ON rp.user_id = gm.user_id
       WHERE gm.group_id = $1`,
      [groupId]
    );

    const contributionStats = await pool.query(
      `SELECT 
         COALESCE(SUM(amount), 0) as total_collected,
         COUNT(*) as contribution_count,
         COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count
       FROM susu_contributions WHERE group_id = $1`,
      [groupId]
    );

    const membersWithWallets = membersResult.rows.filter(m => m.wallet_address);
    const membersConfirmed = membersResult.rows.filter(m => m.commitment_confirmed);
    
    const readinessChecks = {
      minMembers: {
        label: 'Minimum members reached',
        met: (group.member_count || 0) >= (group.min_members_to_activate || 3),
        current: group.member_count || 0,
        required: group.min_members_to_activate || 3
      },
      walletsConnected: {
        label: 'All members have wallets',
        met: membersWithWallets.length === membersResult.rows.length,
        current: membersWithWallets.length,
        required: membersResult.rows.length
      },
      commitmentsConfirmed: {
        label: 'All members confirmed commitment',
        met: membersConfirmed.length === membersResult.rows.length,
        current: membersConfirmed.length,
        required: membersResult.rows.length
      }
    };

    const readinessScore = Object.values(readinessChecks).filter(c => c.met).length / Object.keys(readinessChecks).length * 100;

    const cycleLength = group.cycle_length_days || 30;
    const totalCycles = membersResult.rows.length;
    const payoutSchedule = membersResult.rows.map((member, index) => ({
      cycle: index + 1,
      member: member.first_name || member.username || `Member ${index + 1}`,
      estimatedDate: new Date(Date.now() + (index * cycleLength * 24 * 60 * 60 * 1000)).toISOString(),
      amount: (group.contribution_amount || 0) * membersResult.rows.length
    }));

    res.status(200).json({
      success: true,
      health: {
        group,
        memberCount: membersResult.rows.length,
        readinessScore,
        readinessChecks,
        contributionStats: contributionStats.rows[0],
        payoutSchedule,
        isReadyToGraduate: readinessScore === 100 && !group.graduated_to_pool_id,
        avgReliabilityScore: membersResult.rows.reduce((sum, m) => sum + (m.reliability_score || 50), 0) / Math.max(membersResult.rows.length, 1)
      }
    });
  } catch (error: any) {
    console.error('Error fetching group health:', error);
    res.status(500).json({ error: error.message });
  }
}
