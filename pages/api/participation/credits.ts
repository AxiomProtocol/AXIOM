import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { getUserVeAXMPosition, getCreditScore } from '../../../lib/server/v2ContractService';
import { ethers } from 'ethers';

interface CreditsResponse {
  wallet: string;
  credits: number;
  breakdown: {
    holdingCredits: number;
    actionCredits: number;
    bonusCredits: number;
  };
  tier: number;
  daysHeld: number;
  onChain: {
    veAxmBalance: string;
    votingPower: string;
    creditScore: number;
    lockDuration: number;
  };
}

function calculateTierFromVeAXM(veAxmBalance: string, lockDays: number): number {
  const balance = parseFloat(veAxmBalance);
  if (balance >= 1000 && lockDays >= 180) return 4;
  if (balance >= 100 && lockDays >= 90) return 3;
  if (balance >= 10 && lockDays >= 30) return 2;
  if (balance > 0) return 1;
  return 0;
}

function calculateCreditsFromOnChain(
  veAxmBalance: string, 
  lockDays: number, 
  creditScore: number,
  actionCount: number
): { total: number; holding: number; action: number; bonus: number } {
  const balance = parseFloat(veAxmBalance);
  const holdingCredits = Math.floor(lockDays / 30) * 2 + Math.floor(balance / 10);
  const actionCredits = actionCount * 2;
  const bonusCredits = creditScore >= 700 ? 5 : creditScore >= 600 ? 3 : creditScore >= 500 ? 1 : 0;
  
  return {
    total: holdingCredits + actionCredits + bonusCredits,
    holding: holdingCredits,
    action: actionCredits,
    bonus: bonusCredits
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet } = req.query;

    if (!wallet || typeof wallet !== 'string' || !ethers.isAddress(wallet)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }

    const normalizedWallet = wallet.toLowerCase();
    
    let veAxmData = { votingPower: '0', lockedAmount: '0', unlockTime: 0, lockStart: 0, claimableRewards: '0' };
    let lockDurationDays = 0;
    let creditScore = 0;
    
    try {
      veAxmData = await getUserVeAXMPosition(normalizedWallet);
      if (veAxmData.unlockTime > 0 && veAxmData.lockStart > 0) {
        lockDurationDays = Math.floor((veAxmData.unlockTime - veAxmData.lockStart) / 86400);
      }
    } catch (err) {
      console.warn('veAXM contract call failed, using defaults:', err);
    }
    
    try {
      creditScore = await getCreditScore(normalizedWallet);
    } catch (err) {
      console.warn('Credit score contract call failed, using default:', err);
    }
    
    const actionCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM participation_actions WHERE wallet_address = $1',
      [normalizedWallet]
    );
    
    const actionCount = parseInt(actionCountResult.rows[0]?.count || '0');
    
    const credits = calculateCreditsFromOnChain(
      veAxmData.lockedAmount,
      lockDurationDays,
      creditScore,
      actionCount
    );
    
    const tier = calculateTierFromVeAXM(veAxmData.lockedAmount, lockDurationDays);
    
    await pool.query(`
      INSERT INTO participation_credits 
        (wallet_address, total_credits, holding_credits, action_credits, bonus_credits, ve_axm_balance, on_chain_score, tier, days_held, last_synced_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (wallet_address) DO UPDATE SET
        total_credits = $2,
        holding_credits = $3,
        action_credits = $4,
        bonus_credits = $5,
        ve_axm_balance = $6,
        on_chain_score = $7,
        tier = $8,
        days_held = $9,
        last_synced_at = NOW(),
        updated_at = NOW()
    `, [normalizedWallet, credits.total, credits.holding, credits.action, credits.bonus, veAxmData.lockedAmount, creditScore, tier, lockDurationDays]);

    const response: CreditsResponse = {
      wallet: normalizedWallet,
      credits: credits.total,
      breakdown: {
        holdingCredits: credits.holding,
        actionCredits: credits.action,
        bonusCredits: credits.bonus
      },
      tier,
      daysHeld: lockDurationDays,
      onChain: {
        veAxmBalance: veAxmData.lockedAmount,
        votingPower: veAxmData.votingPower,
        creditScore,
        lockDuration: lockDurationDays
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Credits fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch credits' });
  }
}
