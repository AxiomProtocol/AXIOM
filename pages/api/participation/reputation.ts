import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { getCreditScore, getCreditProfile, getUserVeAXMPosition } from '../../../lib/server/v2ContractService';
import { calculateReputationLevel } from '../../../lib/axiomHolderValue';
import { ethers } from 'ethers';

interface ReputationBreakdown {
  holdingPeriods: number;
  actionsCompleted: number;
  onboardingComplete: boolean;
  susuCycles: number;
  votes: number;
  onChainScore: number;
}

interface ReputationResponse {
  wallet: string;
  points: number;
  level: number;
  levelName: string;
  breakdown: ReputationBreakdown;
  unlocks: string[];
  onChain: {
    creditScore: number;
    creditTier: string;
    totalLoans: number;
    successfulRepayments: number;
    defaults: number;
    veAxmBalance: string;
  };
}

function calculateReputationPoints(breakdown: ReputationBreakdown): number {
  let points = 0;
  points += breakdown.holdingPeriods * 2;
  points += breakdown.actionsCompleted;
  points += breakdown.onboardingComplete ? 2 : 0;
  points += breakdown.susuCycles * 3;
  points += breakdown.votes;
  points += Math.floor(breakdown.onChainScore / 100);
  return points;
}

function getCreditTier(score: number): string {
  if (score >= 750) return 'Excellent';
  if (score >= 700) return 'Good';
  if (score >= 650) return 'Fair';
  if (score >= 600) return 'Developing';
  if (score >= 500) return 'Building';
  return 'New';
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
    
    let creditScore = 0;
    let creditProfile = { score: 0, totalLoans: 0, successfulRepayments: 0, defaults: 0, lastUpdated: 0, isActive: false };
    let veAxmData = { votingPower: '0', lockedAmount: '0', unlockTime: 0, lockStart: 0, claimableRewards: '0' };
    let lockDurationDays = 0;
    
    try {
      creditScore = await getCreditScore(normalizedWallet);
      creditProfile = await getCreditProfile(normalizedWallet);
    } catch (err) {
      console.warn('Credit score contract call failed:', err);
    }
    
    try {
      veAxmData = await getUserVeAXMPosition(normalizedWallet);
      if (veAxmData.unlockTime > 0 && veAxmData.lockStart > 0) {
        lockDurationDays = Math.floor((veAxmData.unlockTime - veAxmData.lockStart) / 86400);
      }
    } catch (err) {
      console.warn('veAXM contract call failed:', err);
    }
    
    const actionsResult = await pool.query(
      `SELECT action_type, COUNT(*) as count FROM participation_actions 
       WHERE wallet_address = $1 GROUP BY action_type`,
      [normalizedWallet]
    );
    
    const actionCounts: Record<string, number> = {};
    actionsResult.rows.forEach((row: { action_type: string; count: string }) => {
      actionCounts[row.action_type] = parseInt(row.count);
    });
    
    const holdingPeriods = Math.floor(lockDurationDays / 30);
    const totalActions = Object.values(actionCounts).reduce((a, b) => a + b, 0);
    
    const breakdown: ReputationBreakdown = {
      holdingPeriods,
      actionsCompleted: totalActions,
      onboardingComplete: totalActions >= 3 || creditProfile.isActive,
      susuCycles: creditProfile.successfulRepayments,
      votes: actionCounts['governance-vote'] || 0,
      onChainScore: creditScore
    };
    
    const points = calculateReputationPoints(breakdown);
    const levelData = calculateReputationLevel(points);

    const response: ReputationResponse = {
      wallet: normalizedWallet,
      points,
      level: levelData.level,
      levelName: levelData.name,
      breakdown,
      unlocks: levelData.unlocks,
      onChain: {
        creditScore,
        creditTier: getCreditTier(creditScore),
        totalLoans: creditProfile.totalLoans,
        successfulRepayments: creditProfile.successfulRepayments,
        defaults: creditProfile.defaults,
        veAxmBalance: veAxmData.lockedAmount
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Reputation fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch reputation' });
  }
}
