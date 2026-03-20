import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { estimateId, regionCode, propertyType, status } = req.query;
      const conditions: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (estimateId) { conditions.push(`estimate_id = $${idx++}`); values.push(estimateId); }
      if (regionCode) { conditions.push(`region_code = $${idx++}`); values.push(regionCode); }
      if (propertyType) { conditions.push(`property_type = $${idx++}`); values.push(propertyType); }
      if (status) { conditions.push(`project_status = $${idx++}`); values.push(status); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          `SELECT b.*,
                  ce.estimate_name,
                  ce.property_type as est_property_type,
                  ce.total_units
           FROM cost_estimate_benchmarks b
           LEFT JOIN cost_estimates ce ON ce.id = b.estimate_id
           ${where}
           ORDER BY b.created_at DESC LIMIT 200`,
          values,
        );

        const stats = rows.length > 0 ? {
          avgVarianceBidPct: avg(rows, 'variance_bid_pct'),
          avgVarianceActualPct: avg(rows, 'variance_actual_pct'),
          totalProjects: rows.length,
          completed: rows.filter(r => r.project_status === 'completed').length,
        } : null;

        return res.json({ benchmarks: rows, stats });
      } finally {
        client.release();
      }
    }

    if (req.method === 'POST') {
      const {
        estimateId, dealId, propertyType, regionCode,
        providerEstimate, adjustedEstimate, contractorBid,
        approvedBudget, actualCost, tradeVariancesJson,
        projectStatus, geography, notes,
      } = req.body || {};

      if (!estimateId || !providerEstimate) {
        return res.status(400).json({ error: 'estimateId and providerEstimate are required' });
      }

      const varianceBid = contractorBid && providerEstimate
        ? Number(contractorBid) - Number(providerEstimate) : null;
      const varianceBidPct = varianceBid && providerEstimate
        ? varianceBid / Number(providerEstimate) : null;
      const varianceActual = actualCost && providerEstimate
        ? Number(actualCost) - Number(providerEstimate) : null;
      const varianceActualPct = varianceActual && providerEstimate
        ? varianceActual / Number(providerEstimate) : null;

      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          `INSERT INTO cost_estimate_benchmarks (
             estimate_id, deal_id, property_type, region_code,
             provider_estimate, adjusted_estimate, contractor_bid, approved_budget,
             actual_cost, variance_bid, variance_bid_pct, variance_actual, variance_actual_pct,
             trade_variances_json, project_status, geography, notes
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           RETURNING *`,
          [
            estimateId, dealId || null, propertyType || null, regionCode || null,
            Number(providerEstimate), Number(adjustedEstimate || providerEstimate),
            contractorBid ? Number(contractorBid) : null,
            approvedBudget ? Number(approvedBudget) : null,
            actualCost ? Number(actualCost) : null,
            varianceBid, varianceBidPct, varianceActual, varianceActualPct,
            tradeVariancesJson ? JSON.stringify(tradeVariancesJson) : null,
            projectStatus || 'pending', geography || null, notes || null,
          ],
        );
        return res.status(201).json({ benchmark: rows[0] });
      } finally {
        client.release();
      }
    }

    if (req.method === 'PATCH') {
      const { id, contractorBid, actualCost, approvedBudget, projectStatus, notes } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });

      const client = await pool.connect();
      try {
        const { rows: bRows } = await client.query('SELECT * FROM cost_estimate_benchmarks WHERE id = $1', [id]);
        if (!bRows[0]) return res.status(404).json({ error: 'Benchmark not found' });
        const b = bRows[0];

        const newContractorBid = contractorBid !== undefined ? Number(contractorBid) : b.contractor_bid;
        const newActualCost = actualCost !== undefined ? Number(actualCost) : b.actual_cost;
        const base = Number(b.provider_estimate);

        const varianceBid = newContractorBid ? newContractorBid - base : null;
        const varianceBidPct = varianceBid ? varianceBid / base : null;
        const varianceActual = newActualCost ? newActualCost - base : null;
        const varianceActualPct = varianceActual ? varianceActual / base : null;

        const { rows } = await client.query(
          `UPDATE cost_estimate_benchmarks SET
             contractor_bid=$1, actual_cost=$2, approved_budget=$3,
             variance_bid=$4, variance_bid_pct=$5, variance_actual=$6, variance_actual_pct=$7,
             project_status=$8, notes=$9, updated_at=NOW()
           WHERE id=$10 RETURNING *`,
          [
            newContractorBid, newActualCost,
            approvedBudget !== undefined ? Number(approvedBudget) : b.approved_budget,
            varianceBid, varianceBidPct, varianceActual, varianceActualPct,
            projectStatus || b.project_status,
            notes !== undefined ? notes : b.notes,
            id,
          ],
        );
        return res.json({ benchmark: rows[0] });
      } finally {
        client.release();
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

function avg(rows: any[], key: string): number {
  const valid = rows.filter(r => r[key] != null);
  if (!valid.length) return 0;
  return Math.round((valid.reduce((s, r) => s + Number(r[key]), 0) / valid.length) * 1000) / 10;
}
