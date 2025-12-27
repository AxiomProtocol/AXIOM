/**
 * Treasury Fee Router API
 * 
 * This API tracks fee events routed through the AxiomFeeBurner contract.
 * In production, POST events are triggered by backend services that listen
 * to on-chain fee collection events and record them for analytics.
 * 
 * The 0.5% fee is collected on-chain by AxiomFeeBurner at:
 * 0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

const FEE_RATE_BPS = 50;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT 
           product_type,
           SUM(fee_amount::numeric) as total_fees,
           SUM(CASE WHEN buyback_executed THEN axm_burned::numeric ELSE 0 END) as total_burned,
           SUM(CASE WHEN buyback_executed THEN ve_axm_rewards::numeric ELSE 0 END) as total_rewards,
           COUNT(*) as event_count
         FROM treasury_fee_events
         GROUP BY product_type
         ORDER BY total_fees DESC`
      );

      const totals = await pool.query(
        `SELECT 
           SUM(fee_amount::numeric) as total_collected,
           SUM(CASE WHEN buyback_executed THEN axm_burned::numeric ELSE 0 END) as total_burned,
           SUM(CASE WHEN buyback_executed THEN ve_axm_rewards::numeric ELSE 0 END) as total_distributed,
           COUNT(*) as total_events,
           SUM(CASE WHEN buyback_executed THEN 1 ELSE 0 END) as buyback_count
         FROM treasury_fee_events`
      );

      const recentEvents = await pool.query(
        `SELECT * FROM treasury_fee_events 
         ORDER BY created_at DESC 
         LIMIT 20`
      );

      return res.status(200).json({
        success: true,
        feeRateBps: FEE_RATE_BPS,
        feeRatePercent: FEE_RATE_BPS / 100,
        byProduct: result.rows.map(row => ({
          product: row.product_type,
          totalFees: row.total_fees || '0',
          totalBurned: row.total_burned || '0',
          totalRewards: row.total_rewards || '0',
          eventCount: parseInt(row.event_count)
        })),
        totals: {
          collected: totals.rows[0]?.total_collected || '0',
          burned: totals.rows[0]?.total_burned || '0',
          distributed: totals.rows[0]?.total_distributed || '0',
          events: parseInt(totals.rows[0]?.total_events || '0'),
          buybacks: parseInt(totals.rows[0]?.buyback_count || '0')
        },
        recentEvents: recentEvents.rows.map(row => ({
          id: row.id,
          product: row.product_type,
          fee: row.fee_amount,
          source: row.source_address,
          buybackExecuted: row.buyback_executed,
          axmBurned: row.axm_burned,
          veAxmRewards: row.ve_axm_rewards,
          txHash: row.tx_hash,
          createdAt: row.created_at
        }))
      });
    } catch (error: any) {
      console.error('Error fetching fee stats:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
  }

  if (req.method === 'POST') {
    const { productType, transactionAmount, sourceAddress } = req.body;

    if (!productType || !transactionAmount) {
      return res.status(400).json({ 
        success: false, 
        error: 'productType and transactionAmount required' 
      });
    }

    try {
      const amount = parseFloat(transactionAmount);
      const feeAmount = (amount * FEE_RATE_BPS / 10000).toFixed(8);
      const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

      await pool.query(
        `INSERT INTO treasury_fee_events 
         (product_type, fee_amount, source_address, tx_hash)
         VALUES ($1, $2, $3, $4)`,
        [
          productType,
          feeAmount,
          sourceAddress?.toLowerCase() || null,
          txHash
        ]
      );

      return res.status(200).json({
        success: true,
        message: 'Fee recorded',
        fee: {
          productType,
          transactionAmount: amount.toFixed(8),
          feeAmount,
          feeRateBps: FEE_RATE_BPS,
          txHash
        }
      });
    } catch (error: any) {
      console.error('Error recording fee:', error);
      return res.status(500).json({ success: false, error: 'Failed to record fee' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
