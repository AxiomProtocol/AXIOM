import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT f.*,
           s.amount as subscription_amount, s.status as subscription_status, s.funding_method as sub_funding_method,
           ip.legal_name, ip.entity_name, ip.email
         FROM syn_funding_records f
         JOIN syn_subscriptions s ON f.subscription_id = s.id
         LEFT JOIN syn_investor_profiles ip ON s.investor_profile_id = ip.id
         WHERE s.offering_id = $1
         ORDER BY f.created_at DESC`,
        [id]
      );

      const totalSettled = result.rows
        .filter((r: any) => r.status === 'completed')
        .reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0);

      return res.status(200).json({
        success: true,
        fundingRecords: result.rows,
        summary: {
          total: result.rows.length,
          totalSettled,
          completedCount: result.rows.filter((r: any) => r.status === 'completed').length,
          pendingCount: result.rows.filter((r: any) => r.status === 'pending').length,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { subscriptionId, externalRef, amount, fundingMethod, settlementDate, settlementMode } = req.body;
      if (!subscriptionId || !amount) {
        return res.status(400).json({ success: false, error: 'subscriptionId and amount are required' });
      }

      const subCheck = await pool.query(
        `SELECT s.id, s.status, s.amount, s.funding_method
         FROM syn_subscriptions s
         WHERE s.id = $1 AND s.offering_id = $2`,
        [subscriptionId, id]
      );

      if (subCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Subscription not found for this offering' });
      }

      const sub = subCheck.rows[0];
      if (sub.status !== 'funded') {
        return res.status(400).json({ success: false, error: 'Subscription must be in funded status to record a receipt' });
      }

      const result = await pool.query(
        `INSERT INTO syn_funding_records
           (subscription_id, funding_method, amount, status, settlement_mode, external_ref, processed_at)
         VALUES ($1, $2, $3, 'completed', $4, $5, $6) RETURNING id`,
        [
          subscriptionId,
          fundingMethod || sub.funding_method || 'wire',
          amount,
          settlementMode || 'offchain',
          externalRef || null,
          settlementDate ? new Date(settlementDate) : new Date(),
        ]
      );

      return res.status(201).json({
        success: true,
        fundingRecordId: result.rows[0].id,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
