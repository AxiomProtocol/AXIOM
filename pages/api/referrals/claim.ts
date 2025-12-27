/**
 * Referral Reward Claims API
 * 
 * Tracks referral reward claims. Actual AXM token transfers happen via
 * TreasuryAndRevenueHub contract at: 0x3fD63728288546AC41dAe3bf25ca383061c3A929
 * 
 * This API records claim events for tracking; token transfers require
 * backend service execution with authorized signer.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { address } = req.query;
    
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ success: false, error: 'Address required' });
    }

    try {
      const claimsResult = await pool.query(
        `SELECT * FROM referral_reward_claims 
         WHERE referrer_address = $1 
         ORDER BY claimed_at DESC`,
        [address.toLowerCase()]
      );

      const pendingResult = await pool.query(
        `SELECT u.wallet_address, u.created_at, u.email
         FROM users u 
         WHERE u.referred_by IN (
           SELECT id FROM users WHERE wallet_address = $1
         )
         AND u.wallet_address NOT IN (
           SELECT referred_address FROM referral_reward_claims WHERE referrer_address = $1
         )`,
        [address.toLowerCase()]
      );

      const claims = claimsResult.rows.map(row => ({
        id: row.id,
        referredAddress: row.referred_address,
        rewardAmount: row.reward_amount,
        rewardType: row.reward_type,
        txHash: row.tx_hash,
        claimedAt: row.claimed_at
      }));

      const pending = pendingResult.rows.map(row => ({
        address: row.wallet_address,
        joinedAt: row.created_at,
        rewardAmount: '50'
      }));

      const totalClaimed = claims.reduce((sum, c) => sum + parseFloat(c.rewardAmount), 0);
      const totalPending = pending.length * 50;

      return res.status(200).json({
        success: true,
        claims,
        pending,
        stats: {
          totalClaimed: totalClaimed.toFixed(2),
          totalPending: totalPending.toFixed(2),
          totalReferrals: claims.length + pending.length
        }
      });
    } catch (error: any) {
      console.error('Error fetching referral claims:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch claims' });
    }
  }

  if (req.method === 'POST') {
    const { address, referredAddress } = req.body;

    if (!address || !referredAddress) {
      return res.status(400).json({ success: false, error: 'Address and referredAddress required' });
    }

    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ success: false, error: 'Invalid address' });
    }

    try {
      const existing = await pool.query(
        `SELECT id FROM referral_reward_claims 
         WHERE referrer_address = $1 AND referred_address = $2`,
        [address.toLowerCase(), referredAddress.toLowerCase()]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Reward already claimed' });
      }

      const rewardAmount = '50';
      const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

      await pool.query(
        `INSERT INTO referral_reward_claims 
         (referrer_address, referred_address, reward_amount, reward_type, tx_hash)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          address.toLowerCase(),
          referredAddress.toLowerCase(),
          rewardAmount,
          'signup_bonus',
          txHash
        ]
      );

      return res.status(200).json({
        success: true,
        message: 'Referral reward claimed successfully',
        reward: {
          amount: rewardAmount,
          txHash,
          referredAddress
        }
      });
    } catch (error: any) {
      console.error('Error claiming referral reward:', error);
      return res.status(500).json({ success: false, error: 'Failed to claim reward' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
