import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const offeringResult = await pool.query(
      `SELECT target_raise FROM syn_offerings WHERE id = $1`,
      [id]
    );

    if (offeringResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Offering not found' });
    }

    const targetRaise = parseFloat(offeringResult.rows[0].target_raise || '0');

    const fundedSubs = await pool.query(
      `SELECT s.investor_profile_id,
              SUM(s.amount::numeric) as total_amount,
              COALESCE(s.meta->>'share_class', 'common') as share_class,
              COUNT(*) as sub_count
       FROM syn_subscriptions s
       WHERE s.offering_id = $1 AND s.status = 'funded'
       GROUP BY s.investor_profile_id, COALESCE(s.meta->>'share_class', 'common')
       ORDER BY total_amount DESC`,
      [id]
    );

    if (fundedSubs.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No funded subscriptions to sync',
        synced: 0,
      });
    }

    const totalFunded = fundedSubs.rows.reduce(
      (sum: number, r: any) => sum + parseFloat(r.total_amount || '0'), 0
    );
    const denominator = targetRaise > 0 ? targetRaise : totalFunded;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `DELETE FROM syn_cap_table WHERE offering_id = $1`,
        [id]
      );

      for (const row of fundedSubs.rows) {
        const amount = parseFloat(row.total_amount || '0');
        const ownershipPct = denominator > 0 ? (amount / denominator) * 100 : 0;
        const units = amount / 100;

        await client.query(
          `INSERT INTO syn_cap_table (offering_id, investor_profile_id, share_class, units, ownership_pct, capital_contributed)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, row.investor_profile_id, row.share_class || 'common', units, ownershipPct.toFixed(4), amount]
        );
      }

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        message: `Cap table synced: ${fundedSubs.rows.length} holders from funded subscriptions`,
        synced: fundedSubs.rows.length,
        totalFunded,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[syndication] Sync cap table error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
