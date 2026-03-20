import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

const VALID_CONDITIONS = new Set(['good', 'light_rehab', 'medium_rehab', 'full_replace', 'not_inspected']);

function condVal(v: unknown): string {
  if (typeof v === 'string' && VALID_CONDITIONS.has(v)) return v;
  return 'not_inspected';
}

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
           roof,
           foundation,
           garage,
           landscaping,
           laundry_room,
           common_area,
           site_parking,
           other,
           general_notes,
           inspection_completed,
           inspection_time,
           created_at,
           updated_at
         ) VALUES (
           $1, $2, $3, $4,
           $5::unit_condition,
           $6::unit_condition,
           $7::unit_condition,
           $8::unit_condition,
           $9::unit_condition,
           $10::unit_condition,
           $11::unit_condition,
           $12::unit_condition,
           $13::unit_condition,
           $14::unit_condition,
           $15::unit_condition,
           $16::unit_condition,
           $17::unit_condition,
           $18::unit_condition,
           $19::unit_condition,
           $20::unit_condition,
           $21::unit_condition,
           $22::unit_condition,
           $23::unit_condition,
           $24, TRUE, $25, NOW(), NOW()
         )
         RETURNING *`,
        [
          sessionId,                                              // $1
          body.unitNumber,                                        // $2
          body.unitType || null,                                  // $3
          body.occupancyStatus || null,                          // $4
          condVal(body.kitchen),                                  // $5
          condVal(body.bathroom),                                 // $6
          condVal(body.flooring),                                 // $7
          condVal(body.appliances),                               // $8
          condVal(body.hvac),                                     // $9
          condVal(body.windows),                                  // $10
          condVal(body.paint),                                    // $11
          condVal(body.plumbing),                                 // $12
          condVal(body.electrical),                               // $13
          condVal(body.doors),                                    // $14
          condVal(body.exterior),                                 // $15
          condVal(body.roof),                                     // $16
          condVal(body.foundation),                               // $17
          condVal(body.garage),                                   // $18
          condVal(body.landscaping),                              // $19
          condVal(body.laundry_room ?? body.laundryRoom),         // $20
          condVal(body.common_area ?? body.commonArea),           // $21
          condVal(body.site_parking ?? body.siteParking),         // $22
          condVal(body.other),                                    // $23
          body.generalNotes || null,                             // $24
          body.inspectionTime || null,                           // $25
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
    console.error('[walks/[sessionId]] error:', error?.message, error?.stack);
    return res.status(500).json({
      error: 'Failed to process unit walk request',
      details: error?.message || String(error),
    });
  }
}
