import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { getUserVeAXMPosition } from '../../../lib/server/v2ContractService';
import { ethers } from 'ethers';

interface InterestResponse {
  success: boolean;
  message: string;
  alreadyRegistered?: boolean;
  position?: number;
  tier?: number;
  eligibility?: {
    hasVeAXM: boolean;
    veAxmBalance: string;
    lockDays: number;
    meetsMinimum: boolean;
  };
}

const MINIMUM_LOCK_DAYS = 30;
const MINIMUM_VEAXM = '1';

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
    
    let veAxmData = { votingPower: '0', lockedAmount: '0', unlockTime: 0, lockStart: 0, claimableRewards: '0' };
    let lockDays = 0;
    
    try {
      veAxmData = await getUserVeAXMPosition(normalizedWallet);
      if (veAxmData.unlockTime > 0 && veAxmData.lockStart > 0) {
        lockDays = Math.floor((veAxmData.unlockTime - veAxmData.lockStart) / 86400);
      }
    } catch (err) {
      console.warn('veAXM contract call failed:', err);
    }
    
    const veAxmBalance = parseFloat(veAxmData.lockedAmount);
    const hasVeAXM = veAxmBalance > 0;
    const meetsMinimum = veAxmBalance >= parseFloat(MINIMUM_VEAXM) && lockDays >= MINIMUM_LOCK_DAYS;
    
    let tier = 0;
    if (veAxmBalance >= 1000 && lockDays >= 180) tier = 4;
    else if (veAxmBalance >= 100 && lockDays >= 90) tier = 3;
    else if (veAxmBalance >= 10 && lockDays >= 30) tier = 2;
    else if (veAxmBalance > 0) tier = 1;
    
    await pool.query(`
      INSERT INTO participation_interest 
        (wallet_address, interest_type, cohort_id, ve_axm_balance, tier, status, metadata)
      VALUES ($1, 'land-cohort', $2, $3, $4, $5, $6)
    `, [normalizedWallet, cohortId, veAxmData.lockedAmount, tier, meetsMinimum ? 'pending' : 'ineligible', JSON.stringify({ lockDays, votingPower: veAxmData.votingPower })]);
    
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
        : 'Interest recorded. Increase veAXM lock to meet eligibility requirements.',
      position: parseInt(totalRegistered.rows[0]?.count || '1'),
      tier,
      eligibility: {
        hasVeAXM,
        veAxmBalance: veAxmData.lockedAmount,
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
