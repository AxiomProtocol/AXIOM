import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rawSessionId = req.query.sessionId;
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  try {
    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.unitNumber) {
        return res.status(400).json({ error: 'unitNumber is required' });
      }

      const result = await pool.query(
        `INSERT INTO field_unit_walk_rows (
           session_id,
           unit_number,
           unit_type,
           occupancy_status,
           kitchen,
           bathroom,
           flooring,
           appliances,
           hvac,
           windows,
           paint,
           plumbing,
           electrical,
           doors,
           exterior,
           common_area,
           site_parking,
           other,
           general_notes,
           inspection_completed,
           inspection_time,
           created_at,
           updated_at
         ) VALUES (
           $1,$2,$3,$4,
           COALESCE($5, 'not_inspected'),
           COALESCE($6, 'not_inspected'),
           COALESCE($7, 'not_inspected'),
           COALESCE($8, 'not_inspected'),
           COALESCE($9, 'not_inspected'),
           COALESCE($10, 'not_inspected'),
           COALESCE($11, 'not_inspected'),
           COALESCE($12, 'not_inspected'),
           COALESCE($13, 'not_inspected'),
           COALESCE($14, 'not_inspected'),
           COALESCE($15, 'not_inspected'),
           COALESCE($16, 'not_inspected'),
           COALESCE($17, 'not_inspected'),
           COALESCE($18, 'not_inspected'),
           $19,
           TRUE,
           $20,
           NOW(),
           NOW()
         )
         RETURNING *`,
        [
          sessionId,
          body.unitNumber,
          body.unitType || null,
          body.occupancyStatus || null,
          body.kitchen,
          body.bathroom,
          body.flooring,
          body.appliances,
          body.hvac,
          body.windows,
          body.paint,
          body.plumbing,
          body.electrical,
          body.doors,
          body.exterior,
          body.commonArea,
          body.siteParking,
          body.other,
          body.generalNotes || null,
          body.inspectionTime || null,
        ],
      );

      await pool.query(
        `UPDATE field_inspection_sessions
         SET units_walked = COALESCE(units_walked, 0) + 1,
             status = CASE WHEN status = 'planned' THEN 'in_progress' ELSE status END,
             sampling_confidence_score = CASE
               WHEN total_units > 0 THEN (COALESCE(units_walked, 0) + 1)::decimal / total_units::decimal
               ELSE 0
             END,
             updated_at = NOW()
         WHERE id = $1`,
        [sessionId],
      );

      return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'GET') {
      const rows = await pool.query(
        `SELECT *
         FROM field_unit_walk_rows
         WHERE session_id = $1
         ORDER BY created_at ASC`,
        [sessionId],
      );
      return res.status(200).json(rows.rows);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to process unit walk request',
      details: error?.message || String(error),
    });
  }
}
