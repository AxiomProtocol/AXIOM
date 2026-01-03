import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { getUserVeAXMPosition } from '../../../lib/server/v2ContractService';
import { ethers } from 'ethers';

interface ReserveResponse {
  success: boolean;
  message: string;
  reservation?: {
    cycleId: string;
    cycleSeason: string;
    cycleYear: number;
    creditsUsed: number;
    status: string;
  };
  creditsRemaining?: number;
  tier?: number;
  slotsRemaining?: number;
}

const CREDITS_PER_RESERVATION = 1;
const MINIMUM_TIER = 1;

function getCurrentCycle(): { cycleId: string; season: string; year: number } {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  
  let season: string;
  if (month >= 2 && month <= 4) season = 'spring';
  else if (month >= 5 && month <= 7) season = 'summer';
  else if (month >= 8 && month <= 10) season = 'fall';
  else season = 'winter';
  
  return {
    cycleId: `${season}-${year}`,
    season,
    year
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet, cycleId: requestedCycleId } = req.body;

    if (!wallet || typeof wallet !== 'string' || !ethers.isAddress(wallet)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }

    const normalizedWallet = wallet.toLowerCase();
    const currentCycle = getCurrentCycle();
    const cycleId = requestedCycleId || currentCycle.cycleId;
    
    const existingReservation = await pool.query(
      `SELECT * FROM produce_reservations WHERE wallet_address = $1 AND cycle_id = $2 LIMIT 1`,
      [normalizedWallet, cycleId]
    );
    
    if (existingReservation.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Already reserved for this cycle'
      });
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
    
    let tier = 0;
    if (veAxmBalance >= 1000 && lockDays >= 180) tier = 4;
    else if (veAxmBalance >= 100 && lockDays >= 90) tier = 3;
    else if (veAxmBalance >= 10 && lockDays >= 30) tier = 2;
    else if (veAxmBalance > 0) tier = 1;
    
    if (tier < MINIMUM_TIER) {
      return res.status(403).json({
        success: false,
        message: `Minimum Tier ${MINIMUM_TIER} required. Lock AXM to increase your tier.`,
        tier
      });
    }
    
    const creditsResult = await pool.query(
      `SELECT total_credits FROM participation_credits WHERE wallet_address = $1 LIMIT 1`,
      [normalizedWallet]
    );
    
    const currentCredits = parseInt(creditsResult.rows[0]?.total_credits || '0');
    
    if (currentCredits < CREDITS_PER_RESERVATION) {
      return res.status(403).json({
        success: false,
        message: `Insufficient credits. You have ${currentCredits}, need ${CREDITS_PER_RESERVATION}.`,
        creditsRemaining: currentCredits
      });
    }
    
    await pool.query(`
      INSERT INTO produce_reservations 
        (wallet_address, cycle_id, cycle_season, cycle_year, credits_used, tier, status, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, 'reserved', $7)
    `, [normalizedWallet, cycleId, currentCycle.season, currentCycle.year, CREDITS_PER_RESERVATION, tier, JSON.stringify({ veAxmBalance: veAxmData.lockedAmount, lockDays })]);
    
    await pool.query(`
      UPDATE participation_credits SET total_credits = total_credits - $1, updated_at = NOW()
      WHERE wallet_address = $2
    `, [CREDITS_PER_RESERVATION, normalizedWallet]);
    
    await pool.query(`
      INSERT INTO participation_actions 
        (wallet_address, action_type, action_value, credits_earned, metadata)
      VALUES ($1, 'produce-reservation', 1, 0, $2)
    `, [normalizedWallet, JSON.stringify({ cycleId, tier, creditsUsed: CREDITS_PER_RESERVATION })]);
    
    const cycleReservationsCount = await pool.query(
      `SELECT COUNT(*) as count FROM produce_reservations WHERE cycle_id = $1`,
      [cycleId]
    );
    
    const totalSlots = 100;
    const slotsRemaining = totalSlots - parseInt(cycleReservationsCount.rows[0]?.count || '0');

    const response: ReserveResponse = {
      success: true,
      message: 'Produce box reserved successfully',
      reservation: {
        cycleId,
        cycleSeason: currentCycle.season,
        cycleYear: currentCycle.year,
        creditsUsed: CREDITS_PER_RESERVATION,
        status: 'reserved'
      },
      creditsRemaining: currentCredits - CREDITS_PER_RESERVATION,
      tier,
      slotsRemaining
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Produce reservation error:', error);
    return res.status(500).json({ error: 'Failed to reserve produce' });
  }
}
