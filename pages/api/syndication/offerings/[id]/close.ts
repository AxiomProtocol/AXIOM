import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const offeringResult = await pool.query(
      `SELECT id, status, target_raise FROM syn_offerings WHERE id = $1`,
      [id]
    );

    if (offeringResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Offering not found' });
    }

    const offering = offeringResult.rows[0];
    const validStatuses = ['raising', 'funded'];
    if (!validStatuses.includes(offering.status)) {
      return res.status(400).json({
        success: false,
        error: `Offering must be in raising or funded status to close. Current status: ${offering.status}`,
      });
    }

    const fundedSubsResult = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount::numeric), 0) as total
       FROM syn_subscriptions
       WHERE offering_id = $1 AND status = 'funded'`,
      [id]
    );

    const fundedCount = parseInt(fundedSubsResult.rows[0].count || '0');
    const fundedTotal = parseFloat(fundedSubsResult.rows[0].total || '0');

    if (fundedCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot close offering with no funded subscriptions',
      });
    }

    const targetRaise = parseFloat(offering.target_raise || '0');
    const denominator = targetRaise > 0 ? targetRaise : fundedTotal;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fundedSubs = await client.query(
        `SELECT s.investor_profile_id,
                SUM(s.amount::numeric) as total_amount,
                COALESCE(s.meta->>'share_class', 'common') as share_class
         FROM syn_subscriptions s
         WHERE s.offering_id = $1 AND s.status = 'funded'
         GROUP BY s.investor_profile_id, COALESCE(s.meta->>'share_class', 'common')
         ORDER BY total_amount DESC`,
        [id]
      );

      await client.query(`DELETE FROM syn_cap_table WHERE offering_id = $1`, [id]);

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

      await client.query(
        `UPDATE syn_offerings SET status = 'closed', close_date = now(), funded_date = now(), updated_at = now() WHERE id = $1`,
        [id]
      );

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        message: `Offering closed successfully. ${fundedSubs.rows.length} capital table entries synced.`,
        fundedSubscriptions: fundedCount,
        totalFunded: fundedTotal,
        capTableEntries: fundedSubs.rows.length,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[syndication] Close offering error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
