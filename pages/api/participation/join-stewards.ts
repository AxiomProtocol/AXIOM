import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { getUserVeAXMPosition } from '../../../lib/server/v2ContractService';
import { ethers } from 'ethers';

interface JoinResponse {
  success: boolean;
  message: string;
  alreadyRegistered?: boolean;
  position?: number;
  cohort?: {
    cohortId: string;
    cohortName: string;
    status: string;
  };
  tier?: number;
  eligibility?: {
    hasVeAXM: boolean;
    veAxmBalance: string;
    lockDays: number;
    meetsMinimum: boolean;
  };
}

const MINIMUM_TIER = 3;
const MINIMUM_LOCK_DAYS = 90;
const MAX_COHORT_SIZE = 25;

function getCurrentCohort(): { cohortId: string; cohortName: string } {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const year = now.getFullYear();
  
  return {
    cohortId: `steward-q${quarter}-${year}`,
    cohortName: `Steward Training Cohort Q${quarter} ${year}`
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet, cohortId: requestedCohortId } = req.body;

    if (!wallet || typeof wallet !== 'string' || !ethers.isAddress(wallet)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }

    const normalizedWallet = wallet.toLowerCase();
    const currentCohort = getCurrentCohort();
    const cohortId = requestedCohortId || currentCohort.cohortId;
    const cohortName = currentCohort.cohortName;
    
    const existingEnrollment = await pool.query(
      `SELECT * FROM steward_cohorts WHERE wallet_address = $1 AND status = 'enrolled' LIMIT 1`,
      [normalizedWallet]
    );
    
    if (existingEnrollment.rows.length > 0) {
      const enrolledCohort = existingEnrollment.rows[0];
      const positionResult = await pool.query(
        `SELECT COUNT(*) as count FROM steward_cohorts WHERE cohort_id = $1`,
        [enrolledCohort.cohort_id]
      );
      
      return res.status(200).json({ 
        success: true, 
        message: 'Already enrolled in steward cohort',
        alreadyRegistered: true,
        position: parseInt(positionResult.rows[0]?.count || '1'),
        cohort: {
          cohortId: enrolledCohort.cohort_id,
          cohortName: enrolledCohort.cohort_name || cohortName,
          status: enrolledCohort.status || 'enrolled'
        }
      } as JoinResponse);
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
    
    let tier = 0;
    if (veAxmBalance >= 1000 && lockDays >= 180) tier = 4;
    else if (veAxmBalance >= 100 && lockDays >= 90) tier = 3;
    else if (veAxmBalance >= 10 && lockDays >= 30) tier = 2;
    else if (veAxmBalance > 0) tier = 1;
    
    const meetsMinimum = tier >= MINIMUM_TIER && lockDays >= MINIMUM_LOCK_DAYS;
    
    if (!meetsMinimum) {
      return res.status(403).json({
        success: false,
        message: `Steward training requires Tier ${MINIMUM_TIER}+ (100+ veAXM, 90+ day lock). Current: Tier ${tier}`,
        tier,
        eligibility: {
          hasVeAXM,
          veAxmBalance: veAxmData.lockedAmount,
          lockDays,
          meetsMinimum
        }
      });
    }
    
    const cohortSizeResult = await pool.query(
      `SELECT COUNT(*) as count FROM steward_cohorts WHERE cohort_id = $1 AND status = 'enrolled'`,
      [cohortId]
    );
    
    const currentSize = parseInt(cohortSizeResult.rows[0]?.count || '0');
    
    if (currentSize >= MAX_COHORT_SIZE) {
      return res.status(400).json({
        success: false,
        message: `Current cohort is full (${MAX_COHORT_SIZE}/${MAX_COHORT_SIZE}). Please wait for the next cohort.`,
        tier
      });
    }
    
    await pool.query(`
      INSERT INTO steward_cohorts 
        (wallet_address, cohort_id, cohort_name, tier, ve_axm_balance, status, metadata)
      VALUES ($1, $2, $3, $4, $5, 'enrolled', $6)
    `, [normalizedWallet, cohortId, cohortName, tier, veAxmData.lockedAmount, JSON.stringify({ lockDays, votingPower: veAxmData.votingPower })]);
    
    await pool.query(`
      INSERT INTO participation_actions 
        (wallet_address, action_type, action_value, credits_earned, metadata)
      VALUES ($1, 'steward-enrollment', 1, 5, $2)
    `, [normalizedWallet, JSON.stringify({ cohortId, cohortName, tier })]);

    const response: JoinResponse = {
      success: true,
      message: 'Successfully enrolled in steward training cohort',
      position: currentSize + 1,
      cohort: {
        cohortId,
        cohortName,
        status: 'enrolled'
      },
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
    console.error('Steward join error:', error);
    return res.status(500).json({ error: 'Failed to join steward cohort' });
  }
}
