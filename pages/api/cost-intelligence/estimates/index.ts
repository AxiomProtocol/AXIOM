import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { dealId, propertyId, status } = req.query;
      const conditions: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (dealId) { conditions.push(`deal_id = $${idx++}`); values.push(dealId); }
      if (propertyId) { conditions.push(`property_id = $${idx++}`); values.push(propertyId); }
      if (status) { conditions.push(`status = $${idx++}`); values.push(status); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          `SELECT id, estimate_name, property_type, status, region_code, total_units,
                  avg_unit_sqft, grand_total, per_unit_cost, confidence, version,
                  generated_at, created_at, updated_at, arv_estimate
           FROM cost_estimates ${where}
           ORDER BY updated_at DESC LIMIT 100`,
          values,
        );
        return res.json({ estimates: rows });
      } finally {
        client.release();
      }
    }

    if (req.method === 'POST') {
      const {
        dealId, propertyId, inspectionSessionId, estimateName,
        propertyType, regionCode, totalUnits, avgUnitSqft,
        contingencyPct, softCostPct, laborAdjPct, materialAdjPct,
        arvEstimate, notes, createdBy,
      } = req.body || {};

      if (!estimateName) return res.status(400).json({ error: 'estimateName is required' });

      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          `INSERT INTO cost_estimates (
             deal_id, property_id, inspection_session_id, estimate_name,
             property_type, region_code, total_units, avg_unit_sqft,
             contingency_pct, soft_cost_pct, labor_adj_pct, material_adj_pct,
             arv_estimate, notes, created_by, status
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'draft')
           RETURNING *`,
          [
            dealId || null, propertyId || null, inspectionSessionId || null,
            estimateName, propertyType || 'multifamily', regionCode || 'NATIONAL',
            Number(totalUnits) || 1, Number(avgUnitSqft) || 1200,
            Number(contingencyPct) || 0.10, Number(softCostPct) || 0.05,
            Number(laborAdjPct) || 0, Number(materialAdjPct) || 0,
            arvEstimate ? Number(arvEstimate) : null, notes || null, createdBy || null,
          ],
        );
        return res.status(201).json({ estimate: rows[0] });
      } finally {
        client.release();
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
