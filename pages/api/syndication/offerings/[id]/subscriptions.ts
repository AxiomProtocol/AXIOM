import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT s.*, ip.legal_name, ip.entity_name, ip.email, ip.wallet_address
         FROM syn_subscriptions s
         LEFT JOIN syn_investor_profiles ip ON s.investor_profile_id = ip.id
         WHERE s.offering_id = $1
         ORDER BY s.created_at DESC`,
        [id]
      );

      const totalCommitted = result.rows.reduce(
        (sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0
      );
      const totalApproved = result.rows
        .filter((r: any) => ['approved', 'funded'].includes(r.status))
        .reduce((sum: number, r: any) => sum + parseFloat(r.amount || '0'), 0);

      return res.status(200).json({
        success: true,
        subscriptions: result.rows,
        summary: { total: result.rows.length, totalCommitted, totalApproved },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { investorProfileId, amount, fundingMethod } = req.body;
      if (!investorProfileId || !amount) {
        return res.status(400).json({ success: false, error: 'investorProfileId and amount are required' });
      }

      const result = await pool.query(
        `INSERT INTO syn_subscriptions (offering_id, investor_profile_id, amount, funding_method)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [id, investorProfileId, amount, fundingMethod || 'wire']
      );

      return res.status(201).json({ success: true, subscriptionId: result.rows[0].id });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { subscriptionId, status, reviewNotes } = req.body;
      if (!subscriptionId || !status) {
        return res.status(400).json({ success: false, error: 'subscriptionId and status required' });
      }

      const validStatuses = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'funded', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }

      const updates: string[] = ['status = $1', 'updated_at = now()'];
      const params: any[] = [status];

      if (status === 'approved') {
        updates.push(`approved_at = now()`);
      }
      if (status === 'rejected' && reviewNotes) {
        params.push(reviewNotes);
        updates.push(`rejection_reason = $${params.length}`);
      }

      params.push(subscriptionId);
      const subIdx = params.length;
      params.push(id);
      const offIdx = params.length;

      await pool.query(
        `UPDATE syn_subscriptions SET ${updates.join(', ')} WHERE id = $${subIdx} AND offering_id = $${offIdx}`,
        params
      );

      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
