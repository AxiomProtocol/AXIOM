import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { getUserSeedPosition } from '../../../lib/server/v2ContractService';
import { ethers } from 'ethers';

interface InterestResponse {
  success: boolean;
  message: string;
  alreadyRegistered?: boolean;
  position?: number;
  tier?: number;
  eligibility?: {
    hasSeed: boolean;
    seedBalance: string;
    lockDays: number;
    meetsMinimum: boolean;
  };
}

const MINIMUM_LOCK_DAYS = 30;
const MINIMUM_SEED = '1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet, cohortId = 'next-land-cohort' } = req.body;

    if (!wallet || typeof wallet !== 'string' || !ethers.isAddress(wallet)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }

    const normalizedWallet = wallet.toLowerCase();
    
    const existingInterest = await pool.query(
      `SELECT * FROM participation_interest 
       WHERE wallet_address = $1 AND interest_type = 'land-cohort' AND status = 'pending' LIMIT 1`,
      [normalizedWallet]
    );
    
    if (existingInterest.rows.length > 0) {
      const totalRegistered = await pool.query(
        `SELECT COUNT(*) as count FROM participation_interest WHERE interest_type = 'land-cohort'`
      );
      
      return res.status(200).json({ 
        success: true, 
        message: 'Interest already recorded',
        alreadyRegistered: true,
        position: parseInt(totalRegistered.rows[0]?.count || '1')
      } as InterestResponse);
    }
    
    let seedData = { votingPower: '0', lockedAmount: '0', unlockTime: 0, lockStart: 0, claimableRewards: '0' };
    let lockDays = 0;
    
    try {
      seedData = await getUserSeedPosition(normalizedWallet);
      if (seedData.unlockTime > 0 && seedData.lockStart > 0) {
        lockDays = Math.floor((seedData.unlockTime - seedData.lockStart) / 86400);
      }
    } catch (err) {
      console.warn('SEED contract call failed:', err);
    }
    
    const seedBalance = parseFloat(seedData.lockedAmount);
    const hasSeed = seedBalance > 0;
    const meetsMinimum = seedBalance >= parseFloat(MINIMUM_SEED) && lockDays >= MINIMUM_LOCK_DAYS;
    
    let tier = 0;
    if (seedBalance >= 1000 && lockDays >= 180) tier = 4;
    else if (seedBalance >= 100 && lockDays >= 90) tier = 3;
    else if (seedBalance >= 10 && lockDays >= 30) tier = 2;
    else if (seedBalance > 0) tier = 1;
    
    await pool.query(`
      INSERT INTO participation_interest 
        (wallet_address, interest_type, cohort_id, seed_balance, tier, status, metadata)
      VALUES ($1, 'land-cohort', $2, $3, $4, $5, $6)
    `, [normalizedWallet, cohortId, seedData.lockedAmount, tier, meetsMinimum ? 'pending' : 'ineligible', JSON.stringify({ lockDays, votingPower: seedData.votingPower })]);
    
    await pool.query(`
      INSERT INTO participation_actions 
        (wallet_address, action_type, action_value, credits_earned, metadata)
      VALUES ($1, 'land-interest', 1, $2, $3)
    `, [normalizedWallet, meetsMinimum ? 2 : 1, JSON.stringify({ cohortId, tier })]);
    
    const totalRegistered = await pool.query(
      `SELECT COUNT(*) as count FROM participation_interest WHERE interest_type = 'land-cohort'`
    );

    const response: InterestResponse = {
      success: true,
      message: meetsMinimum 
        ? 'Interest recorded successfully' 
        : 'Interest recorded. Increase SEED lock to meet eligibility requirements.',
      position: parseInt(totalRegistered.rows[0]?.count || '1'),
      tier,
      eligibility: {
        hasSeed,
        seedBalance: seedData.lockedAmount,
        lockDays,
        meetsMinimum
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Interest recording error:', error);
    return res.status(500).json({ error: 'Failed to record interest' });
  }
}
