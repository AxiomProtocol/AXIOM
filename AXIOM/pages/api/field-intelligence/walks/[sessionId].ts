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

    if (req.method === 'PATCH') {
      const body = req.body || {};
      const { unitWalkId } = body;
      if (!unitWalkId) {
        return res.status(400).json({ error: 'unitWalkId is required for PATCH' });
      }

      const existing = await pool.query(
        `SELECT id FROM field_unit_walk_rows WHERE id = $1 AND session_id = $2 LIMIT 1`,
        [unitWalkId, sessionId],
      );
      if (!existing.rows[0]) {
        return res.status(404).json({ error: 'Unit walk row not found in this session' });
      }

      const result = await pool.query(
        `UPDATE field_unit_walk_rows SET
           unit_type     = COALESCE($2, unit_type),
           occupancy_status = COALESCE($3, occupancy_status),
           kitchen       = $4::unit_condition,
           bathroom      = $5::unit_condition,
           flooring      = $6::unit_condition,
           appliances    = $7::unit_condition,
           hvac          = $8::unit_condition,
           windows       = $9::unit_condition,
           paint         = $10::unit_condition,
           plumbing      = $11::unit_condition,
           electrical    = $12::unit_condition,
           doors         = $13::unit_condition,
           exterior      = $14::unit_condition,
           roof          = $15::unit_condition,
           foundation    = $16::unit_condition,
           garage        = $17::unit_condition,
           landscaping   = $18::unit_condition,
           laundry_room  = $19::unit_condition,
           common_area   = $20::unit_condition,
           site_parking  = $21::unit_condition,
           other         = $22::unit_condition,
           general_notes = COALESCE($23, general_notes),
           inspection_time = COALESCE($24, inspection_time),
           voice_note    = COALESCE($25, voice_note),
           unit_class    = COALESCE($26, unit_class),
           inspection_completed = TRUE,
           updated_at    = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          unitWalkId,
          body.unitType || null,
          body.occupancyStatus || null,
          condVal(body.kitchen),
          condVal(body.bathroom),
          condVal(body.flooring),
          condVal(body.appliances),
          condVal(body.hvac),
          condVal(body.windows),
          condVal(body.paint),
          condVal(body.plumbing),
          condVal(body.electrical),
          condVal(body.doors),
          condVal(body.exterior),
          condVal(body.roof),
          condVal(body.foundation),
          condVal(body.garage),
          condVal(body.landscaping),
          condVal(body.laundry_room ?? body.laundryRoom),
          condVal(body.common_area ?? body.commonArea),
          condVal(body.site_parking ?? body.siteParking),
          condVal(body.other),
          body.generalNotes || null,
          body.inspectionTime || null,
          body.voiceNote || body.voice_note || null,
          body.unitClass || body.unit_class || null,
        ],
      );

      return res.status(200).json(result.rows[0]);
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
