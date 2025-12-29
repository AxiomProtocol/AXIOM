import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  try {
    const userResult = await pool.query(
      `SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1)`,
      [address]
    );

    if (userResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        rebates: [],
        totalRebate: 0,
        pendingClaims: 0,
      });
    }

    const userId = userResult.rows[0].id;

    const memberGroups = await pool.query(
      `SELECT 
        sgm.group_id,
        sg.name as group_name,
        sg.completed_rotations,
        sg.total_contributions,
        COALESCE(fr.total_rebate, 0) as rebate_earned,
        COALESCE(fr.pending_amount, 0) as pending_amount,
        COALESCE(fr.claimed, false) as claimed
       FROM susu_group_members sgm
       JOIN susu_groups sg ON sgm.group_id = sg.id
       LEFT JOIN fee_rebates fr ON fr.group_id = sg.id AND fr.user_id = $1
       WHERE sgm.user_id = $1`,
      [userId]
    );

    const rebates = memberGroups.rows.map(row => {
      const rotations = row.completed_rotations || 0;
      let rebateRate = 0;
      let nextMilestone = 1;
      
      if (rotations >= 12) {
        rebateRate = 0.75;
        nextMilestone = 12;
      } else if (rotations >= 6) {
        rebateRate = 0.50;
        nextMilestone = 12;
      } else if (rotations >= 3) {
        rebateRate = 0.30;
        nextMilestone = 6;
      } else if (rotations >= 1) {
        rebateRate = 0.15;
        nextMilestone = 3;
      } else {
        nextMilestone = 1;
      }

      const contributions = parseFloat(row.total_contributions || '0');
      const feesPaid = contributions * 0.005;
      const rebateEarned = feesPaid * rebateRate;
      const pendingAmount = parseFloat(row.pending_amount || '0');

      return {
        groupId: row.group_id.toString(),
        groupName: row.group_name || 'Unnamed Group',
        completedRotations: rotations,
        totalContributions: contributions,
        rebateEarned: rebateEarned + parseFloat(row.rebate_earned || '0'),
        rebateRate,
        status: pendingAmount > 0 ? 'pending_claim' : rotations > 0 ? 'active' : 'active',
        nextMilestone,
      };
    });

    const totalRebate = rebates.reduce((sum, r) => sum + r.rebateEarned, 0);
    const pendingClaims = rebates.filter(r => r.status === 'pending_claim').reduce((sum, r) => sum + r.rebateEarned, 0);

    return res.status(200).json({
      success: true,
      rebates,
      totalRebate,
      pendingClaims,
    });
  } catch (error) {
    console.error('Rebate status error:', error);
    return res.status(500).json({ error: 'Failed to fetch rebate status' });
  }
}
