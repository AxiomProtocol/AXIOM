import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { groupId, walletAddress } = req.body;
  if (!groupId || !walletAddress) {
    return res.status(400).json({ error: 'Group ID and wallet address required' });
  }

  try {
    const userResult = await pool.query(
      `SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1)`,
      [walletAddress]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult.rows[0].id;

    const rebateResult = await pool.query(
      `SELECT pending_amount FROM fee_rebates 
       WHERE user_id = $1 AND group_id = $2 AND claimed = false`,
      [userId, groupId]
    );

    if (rebateResult.rows.length === 0) {
      return res.status(400).json({ error: 'No pending rebate for this group' });
    }

    const pendingAmount = parseFloat(rebateResult.rows[0].pending_amount || '0');

    await pool.query(
      `UPDATE fee_rebates 
       SET claimed = true, claimed_at = NOW(), total_rebate = total_rebate + pending_amount, pending_amount = 0
       WHERE user_id = $1 AND group_id = $2`,
      [userId, groupId]
    );

    return res.status(200).json({
      success: true,
      message: 'Rebate claimed successfully',
      amount: pendingAmount,
    });
  } catch (error) {
    console.error('Claim rebate error:', error);
    return res.status(500).json({ error: 'Failed to claim rebate' });
  }
}
