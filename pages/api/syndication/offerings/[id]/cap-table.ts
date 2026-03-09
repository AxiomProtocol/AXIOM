import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT c.*, ip.legal_name, ip.entity_name, ip.wallet_address
         FROM syn_cap_table c
         LEFT JOIN syn_investor_profiles ip ON c.investor_profile_id = ip.id
         WHERE c.offering_id = $1
         ORDER BY c.ownership_pct DESC`,
        [id]
      );

      const totalCapital = result.rows.reduce(
        (sum: number, r: any) => sum + parseFloat(r.capital_contributed || '0'), 0
      );
      const totalUnits = result.rows.reduce(
        (sum: number, r: any) => sum + parseFloat(r.units || '0'), 0
      );

      return res.status(200).json({
        success: true,
        capTable: result.rows,
        summary: { totalCapital, totalUnits, holderCount: result.rows.length },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { investorProfileId, shareClass, units, ownershipPct, capitalContributed } = req.body;
      if (!investorProfileId) {
        return res.status(400).json({ success: false, error: 'investorProfileId is required' });
      }

      const result = await pool.query(
        `INSERT INTO syn_cap_table (offering_id, investor_profile_id, share_class, units, ownership_pct, capital_contributed)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [id, investorProfileId, shareClass || 'common', units || 0, ownershipPct || 0, capitalContributed || 0]
      );

      return res.status(201).json({ success: true, capTableId: result.rows[0].id });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
