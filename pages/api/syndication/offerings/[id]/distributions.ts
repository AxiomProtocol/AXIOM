import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT d.*,
           ip.legal_name, ip.entity_name, ip.wallet_address,
           c.ownership_pct, c.capital_contributed, c.share_class as cap_share_class
         FROM syn_distributions d
         LEFT JOIN syn_investor_profiles ip ON d.investor_profile_id = ip.id
         LEFT JOIN syn_cap_table c ON d.cap_table_entry_id = c.id
         WHERE d.offering_id = $1
         ORDER BY d.created_at DESC`,
        [id]
      );

      const totalGross = result.rows.reduce(
        (sum: number, r: any) => sum + parseFloat(r.gross_amount || '0'), 0
      );
      const totalNet = result.rows.reduce(
        (sum: number, r: any) => sum + parseFloat(r.net_amount || '0'), 0
      );
      const completedCount = result.rows.filter((r: any) => r.status === 'completed').length;

      return res.status(200).json({
        success: true,
        distributions: result.rows,
        summary: {
          total: result.rows.length,
          totalGross,
          totalNet,
          completedCount,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { distributionType, grossAmount, periodStart, periodEnd, paymentMethod } = req.body;
      if (!distributionType || !grossAmount) {
        return res.status(400).json({ success: false, error: 'distributionType and grossAmount are required' });
      }

      if (parseFloat(grossAmount) <= 0) {
        return res.status(400).json({ success: false, error: 'grossAmount must be greater than zero' });
      }

      const validTypes = ['preferred_return', 'profit_share', 'return_of_capital', 'refinance_proceeds', 'sale_proceeds'];
      if (!validTypes.includes(distributionType)) {
        return res.status(400).json({ success: false, error: `Invalid distribution type. Must be one of: ${validTypes.join(', ')}` });
      }

      const capResult = await pool.query(
        `SELECT c.id, c.investor_profile_id, c.ownership_pct, c.capital_contributed
         FROM syn_cap_table c
         WHERE c.offering_id = $1
         ORDER BY c.ownership_pct DESC`,
        [id]
      );

      if (capResult.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'No capital table entries found. Sync the capital table before creating distributions.' });
      }

      const totalOwnership = capResult.rows.reduce(
        (sum: number, r: any) => sum + parseFloat(r.ownership_pct || '0'), 0
      );

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const createdIds: string[] = [];
        for (const entry of capResult.rows) {
          const ownershipPct = parseFloat(entry.ownership_pct || '0');
          const proportion = totalOwnership > 0 ? ownershipPct / totalOwnership : 0;
          const investorGross = parseFloat((parseFloat(grossAmount) * proportion).toFixed(2));
          const investorNet = investorGross;

          const insertResult = await client.query(
            `INSERT INTO syn_distributions
               (offering_id, cap_table_entry_id, investor_profile_id, distribution_type,
                gross_amount, net_amount, payment_method, period_start, period_end)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [
              id,
              entry.id,
              entry.investor_profile_id,
              distributionType,
              investorGross,
              investorNet,
              paymentMethod || 'wire',
              periodStart || null,
              periodEnd || null,
            ]
          );
          createdIds.push(insertResult.rows[0].id);
        }

        await client.query('COMMIT');

        return res.status(201).json({
          success: true,
          message: `Created ${createdIds.length} distribution entries`,
          count: createdIds.length,
          distributionIds: createdIds,
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { distributionId, status } = req.body;
      if (!distributionId || !status) {
        return res.status(400).json({ success: false, error: 'distributionId and status are required' });
      }

      const validTransitions: Record<string, string[]> = {
        draft: ['approved'],
        approved: ['processing'],
        processing: ['completed', 'failed'],
      };

      const current = await pool.query(
        `SELECT status FROM syn_distributions WHERE id = $1 AND offering_id = $2`,
        [distributionId, id]
      );

      if (current.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Distribution not found' });
      }

      const currentStatus = current.rows[0].status;
      const allowed = validTransitions[currentStatus] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Cannot transition from ${currentStatus} to ${status}. Allowed: ${allowed.join(', ') || 'none'}`,
        });
      }

      const updates: string[] = ['status = $1', 'updated_at = now()'];
      const params: any[] = [status];

      if (status === 'completed') {
        updates.push('paid_at = now()');
      }

      params.push(distributionId);
      params.push(id);
      await pool.query(
        `UPDATE syn_distributions SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND offering_id = $${params.length}`,
        params
      );

      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { distributionId } = req.body;
      if (!distributionId) {
        return res.status(400).json({ success: false, error: 'distributionId is required' });
      }

      await pool.query(
        `DELETE FROM syn_distributions WHERE id = $1 AND offering_id = $2 AND status = 'draft'`,
        [distributionId, id]
      );

      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
