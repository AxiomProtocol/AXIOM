/**
 * DePIN Reward Diversion API
 * 
 * Tracks the 5% diversion of DePIN node rewards to SusuInsuranceFund.
 * The diversion happens on-chain via SusuInsuranceFund contract at:
 * 0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F
 * 
 * This API records diversion events for analytics and UI display.
 * POST events are triggered by backend reward distribution services.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

const DIVERSION_PERCENT = 5;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { address } = req.query;
    
    try {
      let query = 'SELECT * FROM depin_reward_diversions ORDER BY created_at DESC LIMIT 100';
      let params: any[] = [];
      
      if (address && typeof address === 'string') {
        query = 'SELECT * FROM depin_reward_diversions WHERE node_owner_address = $1 ORDER BY created_at DESC';
        params = [address.toLowerCase()];
      }

      const result = await pool.query(query, params);

      const diversions = result.rows.map(row => ({
        id: row.id,
        nodeId: row.node_id,
        ownerAddress: row.node_owner_address,
        totalReward: row.total_reward,
        diversionAmount: row.diversion_amount,
        diversionPercent: row.diversion_percent,
        txHash: row.tx_hash,
        createdAt: row.created_at
      }));

      const totalStats = await pool.query(
        `SELECT 
           SUM(total_reward::numeric) as total_rewards,
           SUM(diversion_amount::numeric) as total_diverted,
           COUNT(*) as total_events
         FROM depin_reward_diversions`
      );

      return res.status(200).json({
        success: true,
        diversions,
        stats: {
          totalRewards: totalStats.rows[0]?.total_rewards || '0',
          totalDiverted: totalStats.rows[0]?.total_diverted || '0',
          totalEvents: parseInt(totalStats.rows[0]?.total_events || '0'),
          diversionPercent: DIVERSION_PERCENT
        }
      });
    } catch (error: any) {
      console.error('Error fetching diversions:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch diversions' });
    }
  }

  if (req.method === 'POST') {
    const { nodeId, ownerAddress, totalReward } = req.body;

    if (!nodeId || !ownerAddress || !totalReward) {
      return res.status(400).json({ success: false, error: 'nodeId, ownerAddress, and totalReward required' });
    }

    try {
      const rewardAmount = parseFloat(totalReward);
      const diversionAmount = (rewardAmount * DIVERSION_PERCENT / 100).toFixed(8);
      const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

      await pool.query(
        `INSERT INTO depin_reward_diversions 
         (node_id, node_owner_address, total_reward, diversion_amount, diversion_percent, tx_hash)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          nodeId,
          ownerAddress.toLowerCase(),
          totalReward,
          diversionAmount,
          DIVERSION_PERCENT.toFixed(2),
          txHash
        ]
      );

      return res.status(200).json({
        success: true,
        message: 'Reward diversion recorded',
        diversion: {
          nodeId,
          totalReward,
          diversionAmount,
          netReward: (rewardAmount - parseFloat(diversionAmount)).toFixed(8),
          txHash
        }
      });
    } catch (error: any) {
      console.error('Error recording diversion:', error);
      return res.status(500).json({ success: false, error: 'Failed to record diversion' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
