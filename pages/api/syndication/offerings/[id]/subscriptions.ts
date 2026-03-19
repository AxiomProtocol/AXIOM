import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { recordCapitalIntelligenceEvent } from '../../../../../lib/capitalIntelligence';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT s.*, ip.legal_name, ip.entity_name, ip.email, ip.wallet_address, ip.meta AS investor_meta
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
      const { investorProfileId, amount, fundingMethod, shareClass, paymentCurrency, investorWallet } = req.body;
      if (!investorProfileId || !amount) {
        return res.status(400).json({ success: false, error: 'investorProfileId and amount are required' });
      }

      const result = await pool.query(
        `INSERT INTO syn_subscriptions (offering_id, investor_profile_id, amount, funding_method, payment_currency, investor_wallet, meta)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [id, investorProfileId, amount, fundingMethod || 'wire', paymentCurrency || 'USD', investorWallet || null, JSON.stringify({ share_class: shareClass || 'common' })]
      );

      const subscriptionId = result.rows[0].id;

      await recordCapitalIntelligenceEvent({
        offeringId: id as string,
        eventType: 'commitment_submitted',
        capitalSourceType: fundingMethod || 'wire',
        payload: {
          subscriptionId,
          amount: parseFloat(amount),
          shareClass: shareClass || 'common',
          paymentCurrency: paymentCurrency || 'USD',
        },
      });

      return res.status(201).json({ success: true, subscriptionId });
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
      if (status === 'funded') {
        updates.push(`funded_at = now()`);
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

      if (status === 'funded') {
        try {
          const subResult = await pool.query(
            `SELECT investor_profile_id, COALESCE(meta->>'share_class', 'common') as share_class
             FROM syn_subscriptions WHERE id = $1`,
            [subscriptionId]
          );
          if (subResult.rows.length > 0) {
            const sub = subResult.rows[0];

            const aggResult = await pool.query(
              `SELECT SUM(amount::numeric) as total_funded
               FROM syn_subscriptions
               WHERE offering_id = $1 AND investor_profile_id = $2 AND status = 'funded'`,
              [id, sub.investor_profile_id]
            );
            const investorTotal = parseFloat(aggResult.rows[0]?.total_funded || '0');

            const offeringResult = await pool.query(
              `SELECT target_raise FROM syn_offerings WHERE id = $1`,
              [id]
            );
            const targetRaise = parseFloat(offeringResult.rows[0]?.target_raise || '0');

            const allFundedResult = await pool.query(
              `SELECT SUM(amount::numeric) as grand_total
               FROM syn_subscriptions WHERE offering_id = $1 AND status = 'funded'`,
              [id]
            );
            const grandTotal = parseFloat(allFundedResult.rows[0]?.grand_total || '0');
            const denominator = targetRaise > 0 ? targetRaise : grandTotal;
            const ownershipPct = denominator > 0 ? (investorTotal / denominator) * 100 : 0;
            const units = investorTotal / 100;

            const existing = await pool.query(
              `SELECT id FROM syn_cap_table WHERE offering_id = $1 AND investor_profile_id = $2 LIMIT 1`,
              [id, sub.investor_profile_id]
            );
            if (existing.rows.length > 0) {
              await pool.query(
                `UPDATE syn_cap_table SET
                   capital_contributed = $1,
                   units = $2,
                   ownership_pct = $3,
                   updated_at = now()
                 WHERE id = $4`,
                [investorTotal, units, ownershipPct.toFixed(4), existing.rows[0].id]
              );
            } else {
              await pool.query(
                `INSERT INTO syn_cap_table (offering_id, investor_profile_id, share_class, units, ownership_pct, capital_contributed)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [id, sub.investor_profile_id, sub.share_class, units, ownershipPct.toFixed(4), investorTotal]
              );
            }
          }
        } catch (capErr) {
          console.error('[syndication] Auto-sync cap table error (non-fatal):', capErr);
        }

        await recordCapitalIntelligenceEvent({
          offeringId: id as string,
          eventType: 'capital_call_paid',
          capitalSourceType: 'subscription',
          minimumCapitalMet: null,
          payload: {
            subscriptionId,
            status: 'funded',
          },
        });
      }

      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
