import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { wallet, poolAddress } = req.query;

  try {
    const now = new Date();
    
    const programsResult = await pool.query(
      `SELECT * FROM lp_incentive_programs 
       WHERE is_active = true AND end_date >= $1`,
      [now.toISOString()]
    );

    const programs = programsResult.rows;

    const programsWithDetails = programs.map((program: any) => {
      const totalRewards = parseFloat(program.total_rewards || '0');
      const distributed = parseFloat(program.distributed_rewards || '0');
      const remaining = totalRewards - distributed;
      const dailyRewards = parseFloat(program.rewards_per_day || '0');
      
      const startDate = new Date(program.start_date);
      const endDate = new Date(program.end_date);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, totalDays - elapsedDays);
      
      return {
        id: program.id,
        name: program.name,
        poolAddress: program.pool_address,
        rewardToken: program.reward_token_symbol,
        rewards: {
          total: totalRewards.toFixed(2),
          distributed: distributed.toFixed(2),
          remaining: remaining.toFixed(2),
          daily: dailyRewards.toFixed(4)
        },
        bonusMultiplier: program.bonus_multiplier,
        minLockDays: program.min_lock_days,
        duration: {
          startDate: program.start_date,
          endDate: program.end_date,
          totalDays,
          elapsedDays,
          remainingDays,
          progressPercent: ((elapsedDays / totalDays) * 100).toFixed(1)
        },
        isActive: program.is_active
      };
    });

    let userPosition = null;
    if (wallet && typeof wallet === 'string') {
      const positionsResult = await pool.query(
        'SELECT * FROM lp_positions WHERE wallet_address = $1',
        [wallet.toLowerCase()]
      );
      
      if (positionsResult.rows.length > 0) {
        userPosition = positionsResult.rows.map((pos: any) => ({
          poolAddress: pos.pool_address,
          lpBalance: pos.lp_token_balance,
          entryValue: pos.entry_value,
          currentValue: pos.current_value,
          unclaimedRewards: pos.unclaimed_rewards,
          claimedRewards: pos.claimed_rewards,
          stakingMultiplier: pos.staking_multiplier,
          lockEndDate: pos.lock_end_date,
          firstDepositAt: pos.first_deposit_at
        }));
      }
    }

    const earlyLPBonusTiers = [
      { tier: 1, minTvl: 0, maxTvl: 10000, multiplier: 2.0, description: 'Pioneer (First $10K TVL)' },
      { tier: 2, minTvl: 10000, maxTvl: 50000, multiplier: 1.5, description: 'Early Adopter ($10K-$50K TVL)' },
      { tier: 3, minTvl: 50000, maxTvl: 100000, multiplier: 1.25, description: 'Builder ($50K-$100K TVL)' },
      { tier: 4, minTvl: 100000, maxTvl: null, multiplier: 1.0, description: 'Standard (>$100K TVL)' }
    ];

    res.status(200).json({
      success: true,
      data: {
        activePrograms: programsWithDetails,
        userPosition,
        bonusTiers: earlyLPBonusTiers,
        info: {
          description: 'Early liquidity providers receive bonus AXM rewards based on their contribution timing and lock duration.',
          claimSchedule: 'Weekly on Sundays at 00:00 UTC',
          lockBenefits: [
            '30-day lock: 1.25x rewards',
            '90-day lock: 1.5x rewards',
            '180-day lock: 2.0x rewards'
          ]
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Incentives API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch incentives',
      details: error.message
    });
  }
}
