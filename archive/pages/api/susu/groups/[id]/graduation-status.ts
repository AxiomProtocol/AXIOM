import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const groupId = parseInt(id as string);

    const groupResult = await pool.query(`
      SELECT 
        g.id,
        g.display_name as name,
        g.contribution_amount,
        g.member_count,
        g.cycle_length_days,
        g.min_members_to_activate,
        g.graduated_to_pool_id,
        g.created_at,
        pc.name as category_name
      FROM susu_purpose_groups g
      LEFT JOIN susu_purpose_categories pc ON pc.id = g.purpose_category_id
      WHERE g.id = $1
    `, [groupId]);

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupResult.rows[0];

    const thresholdsResult = await pool.query(`
      SELECT threshold_key, threshold_value FROM susu_mode_thresholds
    `);
    
    const thresholds = thresholdsResult.rows.reduce((acc: any, row: any) => {
      acc[row.threshold_key] = parseFloat(row.threshold_value);
      return acc;
    }, {
      contribution_amount_usd: 1000,
      total_pot_estimate_usd: 10000,
      group_size: 20,
      cycle_length_days: 90
    });

    const membersResult = await pool.query(`
      SELECT 
        gm.id,
        gm.commitment_confirmed,
        u.wallet_address
      FROM susu_group_members gm
      LEFT JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = $1
    `, [groupId]);

    const contributionsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_contributions,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_contributions,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_collected
      FROM susu_contributions
      WHERE group_id = $1
    `, [groupId]);

    const cyclesResult = await pool.query(`
      SELECT COUNT(DISTINCT cycle_number) as completed_cycles
      FROM susu_contributions
      WHERE group_id = $1 AND status = 'paid'
    `, [groupId]);

    const memberCount = membersResult.rows.length;
    const contributionAmount = parseFloat(group.contribution_amount) || 0;
    const cycleLengthDays = group.cycle_length_days || 30;
    const totalPotEstimate = contributionAmount * memberCount;
    const completedCycles = parseInt(cyclesResult.rows[0]?.completed_cycles) || 0;

    const membersWithWallets = membersResult.rows.filter((m: any) => m.wallet_address);
    const membersConfirmed = membersResult.rows.filter((m: any) => m.commitment_confirmed);

    const capitalModeProgress = {
      contribution: {
        label: 'Contribution Amount',
        current: contributionAmount,
        threshold: thresholds.contribution_amount_usd,
        progress: Math.min((contributionAmount / thresholds.contribution_amount_usd) * 100, 100),
        met: contributionAmount >= thresholds.contribution_amount_usd,
        unit: 'USD'
      },
      totalPot: {
        label: 'Total Pot Size',
        current: totalPotEstimate,
        threshold: thresholds.total_pot_estimate_usd,
        progress: Math.min((totalPotEstimate / thresholds.total_pot_estimate_usd) * 100, 100),
        met: totalPotEstimate >= thresholds.total_pot_estimate_usd,
        unit: 'USD'
      },
      groupSize: {
        label: 'Group Size',
        current: memberCount,
        threshold: thresholds.group_size,
        progress: Math.min((memberCount / thresholds.group_size) * 100, 100),
        met: memberCount >= thresholds.group_size,
        unit: 'members'
      },
      cycleLength: {
        label: 'Cycle Length',
        current: cycleLengthDays,
        threshold: thresholds.cycle_length_days,
        progress: Math.min((cycleLengthDays / thresholds.cycle_length_days) * 100, 100),
        met: cycleLengthDays >= thresholds.cycle_length_days,
        unit: 'days'
      }
    };

    const basicReadiness = {
      minMembers: {
        label: 'Minimum Members',
        current: memberCount,
        required: group.min_members_to_activate || 3,
        met: memberCount >= (group.min_members_to_activate || 3)
      },
      walletsConnected: {
        label: 'Wallets Connected',
        current: membersWithWallets.length,
        required: memberCount,
        met: membersWithWallets.length === memberCount && memberCount > 0
      },
      commitmentsConfirmed: {
        label: 'Commitments Confirmed',
        current: membersConfirmed.length,
        required: memberCount,
        met: membersConfirmed.length === memberCount && memberCount > 0
      }
    };

    const basicReadinessScore = Object.values(basicReadiness).filter(c => c.met).length / Object.keys(basicReadiness).length * 100;

    const capitalModeThresholdsMet = Object.values(capitalModeProgress).filter(c => c.met).length;
    const isCapitalMode = capitalModeThresholdsMet > 0;
    const currentMode = isCapitalMode ? 'capital' : 'community';

    const isReadyToGraduate = basicReadinessScore === 100 && !group.graduated_to_pool_id;
    const alreadyGraduated = !!group.graduated_to_pool_id;

    const daysSinceCreation = Math.floor((Date.now() - new Date(group.created_at).getTime()) / (1000 * 60 * 60 * 24));
    
    let estimatedGraduationDays = null;
    if (!isReadyToGraduate && !alreadyGraduated) {
      const missingMembers = Math.max(0, (group.min_members_to_activate || 3) - memberCount);
      estimatedGraduationDays = missingMembers * 7;
    }

    res.status(200).json({
      success: true,
      graduationStatus: {
        groupId,
        groupName: group.name,
        categoryName: group.category_name,
        currentMode,
        isReadyToGraduate,
        alreadyGraduated,
        graduatedPoolId: group.graduated_to_pool_id,
        basicReadiness,
        basicReadinessScore,
        capitalModeProgress,
        capitalModeThresholdsMet,
        totalCapitalThresholds: Object.keys(capitalModeProgress).length,
        stats: {
          memberCount,
          contributionAmount,
          totalPotEstimate,
          cycleLengthDays,
          completedCycles,
          daysSinceCreation,
          totalCollected: parseFloat(contributionsResult.rows[0]?.total_collected) || 0
        },
        estimatedGraduationDays,
        thresholds
      }
    });
  } catch (error: any) {
    console.error('Error fetching graduation status:', error);
    res.status(500).json({ error: error.message });
  }
}
