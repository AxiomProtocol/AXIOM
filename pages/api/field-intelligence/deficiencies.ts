import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      const {
        unitWalkId,
        system,
        severity,
        title,
        description,
        estimatedRepairCost,
        estimatedDaysToFix,
        needsImmediateAttention,
        affectsTenancy,
      } = req.body || {};

      if (!unitWalkId || !system || !severity || !title) {
        return res.status(400).json({
          error: 'Missing required fields: unitWalkId, system, severity, title',
        });
      }

      const walk = await pool.query(
        `SELECT id FROM field_unit_walk_rows WHERE id = $1 LIMIT 1`,
        [unitWalkId],
      );
      if (!walk.rows.length) {
        return res.status(404).json({ error: 'Unit walk not found' });
      }

      const inserted = await pool.query(
        `INSERT INTO field_unit_walk_deficiencies (
           unit_walk_id,
           system,
           severity,
           title,
           description,
           estimated_repair_cost,
           estimated_days_to_fix,
           needs_immediate_attention,
           affects_tenancy,
           meta,
           created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
         RETURNING *`,
        [
          unitWalkId,
          system,
          severity,
          title,
          description || null,
          estimatedRepairCost != null ? Number(estimatedRepairCost) : null,
          estimatedDaysToFix != null ? Number(estimatedDaysToFix) : null,
          Boolean(needsImmediateAttention),
          Boolean(affectsTenancy),
          {
            reportedAt: new Date().toISOString(),
          },
        ],
      );

      return res.status(201).json(inserted.rows[0]);
    }

    if (req.method === 'GET') {
      const unitWalkId = typeof req.query.unitWalkId === 'string' ? req.query.unitWalkId : null;
      if (!unitWalkId) {
        return res.status(400).json({ error: 'unitWalkId query parameter required' });
      }

      const rows = await pool.query(
        `SELECT *
         FROM field_unit_walk_deficiencies
         WHERE unit_walk_id = $1
         ORDER BY created_at ASC`,
        [unitWalkId],
      );
      return res.status(200).json(rows.rows);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to process deficiencies request',
      details: error?.message || String(error),
    });
  }
}
