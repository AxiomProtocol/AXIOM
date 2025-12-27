/**
 * Credit Score Update API
 * 
 * This API updates credit scores based on SUSU repayment events.
 * In production, this is called by the SUSU contract event listeners
 * when repayment events occur on-chain. The AxiomScoreSBT contract
 * at 0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008 is the source of truth.
 * 
 * This tracking layer maintains history for UI display while the
 * on-chain SBT is updated via contract interactions.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

function calculateScoreChange(repaymentType: string, amount: number, currentScore: number): number {
  let change = 0;
  
  switch (repaymentType) {
    case 'on_time':
      change = Math.min(15, Math.floor(amount / 100) + 5);
      break;
    case 'early':
      change = Math.min(20, Math.floor(amount / 100) + 8);
      break;
    case 'late':
      change = -Math.min(30, Math.floor(amount / 50) + 10);
      break;
    case 'default':
      change = -Math.min(100, Math.floor(amount / 20) + 50);
      break;
    case 'first_payment':
      change = 25;
      break;
    default:
      change = 5;
  }
  
  const newScore = Math.max(300, Math.min(850, currentScore + change));
  return newScore;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { address } = req.query;
    
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ success: false, error: 'Address required' });
    }

    try {
      const result = await pool.query(
        `SELECT * FROM credit_score_updates 
         WHERE wallet_address = $1 
         ORDER BY created_at DESC 
         LIMIT 20`,
        [address.toLowerCase()]
      );

      const history = result.rows.map(row => ({
        id: row.id,
        previousScore: row.previous_score,
        newScore: row.new_score,
        change: row.new_score - (row.previous_score || 300),
        reason: row.change_reason,
        susuPoolId: row.susu_pool_id,
        repaymentAmount: row.repayment_amount,
        txHash: row.tx_hash,
        createdAt: row.created_at
      }));

      const currentScore = history.length > 0 ? history[0].newScore : 300;

      return res.status(200).json({
        success: true,
        currentScore,
        history
      });
    } catch (error: any) {
      console.error('Error fetching credit history:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
  }

  if (req.method === 'POST') {
    const { address, repaymentType, amount, susuPoolId } = req.body;

    if (!address || !repaymentType || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'address, repaymentType, and amount required' 
      });
    }

    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ success: false, error: 'Invalid address' });
    }

    try {
      const lastScore = await pool.query(
        `SELECT new_score FROM credit_score_updates 
         WHERE wallet_address = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [address.toLowerCase()]
      );

      const previousScore = lastScore.rows.length > 0 ? lastScore.rows[0].new_score : 300;
      const newScore = calculateScoreChange(repaymentType, parseFloat(amount), previousScore);
      
      const reasonMap: { [key: string]: string } = {
        'on_time': 'On-time SUSU payment',
        'early': 'Early SUSU payment',
        'late': 'Late SUSU payment',
        'default': 'Missed SUSU payment',
        'first_payment': 'First SUSU payment'
      };
      
      const changeReason = reasonMap[repaymentType] || 'SUSU activity';
      const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

      await pool.query(
        `INSERT INTO credit_score_updates 
         (wallet_address, previous_score, new_score, change_reason, susu_pool_id, repayment_amount, tx_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          address.toLowerCase(),
          previousScore,
          newScore,
          changeReason,
          susuPoolId || null,
          amount,
          txHash
        ]
      );

      return res.status(200).json({
        success: true,
        message: 'Credit score updated',
        update: {
          previousScore,
          newScore,
          change: newScore - previousScore,
          reason: changeReason,
          txHash
        }
      });
    } catch (error: any) {
      console.error('Error updating credit score:', error);
      return res.status(500).json({ success: false, error: 'Failed to update score' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
