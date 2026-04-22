import { NextApiRequest, NextApiResponse } from 'next';
import { calculateStewardEligibility, StewardStatus } from '../../../lib/stewardCorps';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  try {
    let axmBalance = 0;
    let holdingDays = 0;
    let participationCount = 0;
    let stewardStatus: StewardStatus = 'none';

    try {
      const holdingResult = await pool.query(
        `SELECT 
          COALESCE(token_balance, 0) as balance,
          COALESCE(EXTRACT(EPOCH FROM (NOW() - first_seen_at)) / 86400, 0) as holding_days
        FROM user_tokens 
        WHERE LOWER(wallet_address) = LOWER($1)`,
        [wallet]
      );

      if (holdingResult.rows.length > 0) {
        axmBalance = parseFloat(holdingResult.rows[0].balance) || 0;
        holdingDays = Math.floor(holdingResult.rows[0].holding_days) || 0;
      }

      const participationResult = await pool.query(
        `SELECT COUNT(*) as action_count
        FROM participation_actions 
        WHERE LOWER(wallet_address) = LOWER($1)`,
        [wallet]
      );

      if (participationResult.rows.length > 0) {
        participationCount = parseInt(participationResult.rows[0].action_count) || 0;
      }

      const stewardResult = await pool.query(
        `SELECT status FROM steward_applications 
        WHERE LOWER(wallet_address) = LOWER($1) 
        ORDER BY created_at DESC LIMIT 1`,
        [wallet]
      );

      if (stewardResult.rows.length > 0) {
        stewardStatus = stewardResult.rows[0].status as StewardStatus;
      }
    } catch (dbErr) {
      console.log('Database tables may not exist yet, using defaults');
    }

    const eligibility = calculateStewardEligibility({
      isConnected: true,
      axmBalance,
      holdingDays,
      participationCount
    });

    console.log('steward_eligibility_check', { wallet: wallet.slice(0, 10), eligible: eligibility.eligible });

    return res.status(200).json({
      success: true,
      wallet,
      eligibility,
      status: stewardStatus
    });
  } catch (error: any) {
    console.error('Error checking eligibility:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to check eligibility'
    });
  }
}
