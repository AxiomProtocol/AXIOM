import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

const VALID_CONDITIONS = new Set(['good', 'light_rehab', 'medium_rehab', 'full_replace', 'not_inspected']);
function condVal(v: unknown): string {
  if (typeof v === 'string' && VALID_CONDITIONS.has(v)) return v;
  return 'not_inspected';
}

function parseUnitNumbers(input: string): string[] {
  const parts = input.split(',').map((s) => s.trim()).filter(Boolean);
  const results: string[] = [];
  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (start <= end && end - start <= 500) {
        for (let i = start; i <= end; i++) results.push(String(i));
      }
    } else if (/^\w[\w\s-]*$/.test(part)) {
      results.push(part);
    }
  }
  return [...new Set(results)];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rawId = req.query.sessionId;
  const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { sourceUnitWalkId, targetUnits, overwrite = false } = req.body || {};

    if (!sourceUnitWalkId || !targetUnits) {
      return res.status(400).json({ error: 'sourceUnitWalkId and targetUnits are required' });
    }

    const sourceRes = await pool.query(
      `SELECT * FROM field_unit_walk_rows WHERE id = $1 AND session_id = $2 LIMIT 1`,
      [sourceUnitWalkId, sessionId],
    );
    if (!sourceRes.rows[0]) {
      return res.status(404).json({ error: 'Source unit walk row not found in this session' });
    }
    const src = sourceRes.rows[0];

    const unitNums = Array.isArray(targetUnits)
      ? targetUnits.map(String)
      : parseUnitNumbers(String(targetUnits));

    if (unitNums.length === 0) {
      return res.status(400).json({ error: 'No valid target unit numbers provided' });
    }
    if (unitNums.length > 200) {
      return res.status(400).json({ error: 'Maximum 200 units per replication batch' });
    }

    const existingRes = await pool.query(
      `SELECT unit_number, id FROM field_unit_walk_rows WHERE session_id = $1 AND unit_number = ANY($2)`,
      [sessionId, unitNums],
    );
    const existingMap = new Map<string, string>(existingRes.rows.map((r: any) => [r.unit_number, r.id]));

    const created: any[] = [];
    const skipped: string[] = [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const unitNum of unitNums) {
        if (unitNum === src.unit_number) continue;
        if (existingMap.has(unitNum) && !overwrite) {
          skipped.push(unitNum);
          continue;
        }

        if (existingMap.has(unitNum) && overwrite) {
          const updated = await client.query(
            `UPDATE field_unit_walk_rows SET
               unit_type = $2, occupancy_status = $3,
               kitchen = $4::unit_condition, bathroom = $5::unit_condition,
               flooring = $6::unit_condition, appliances = $7::unit_condition,
               hvac = $8::unit_condition, windows = $9::unit_condition,
               paint = $10::unit_condition, plumbing = $11::unit_condition,
               electrical = $12::unit_condition, doors = $13::unit_condition,
               exterior = $14::unit_condition, roof = $15::unit_condition,
               foundation = $16::unit_condition, garage = $17::unit_condition,
               landscaping = $18::unit_condition, laundry_room = $19::unit_condition,
               common_area = $20::unit_condition, site_parking = $21::unit_condition,
               other = $22::unit_condition, general_notes = $23,
               inspection_completed = TRUE, updated_at = NOW()
             WHERE session_id = $1 AND unit_number = $24
             RETURNING *`,
            [
              sessionId, src.unit_type, src.occupancy_status,
              condVal(src.kitchen), condVal(src.bathroom), condVal(src.flooring),
              condVal(src.appliances), condVal(src.hvac), condVal(src.windows),
              condVal(src.paint), condVal(src.plumbing), condVal(src.electrical),
              condVal(src.doors), condVal(src.exterior), condVal(src.roof),
              condVal(src.foundation), condVal(src.garage), condVal(src.landscaping),
              condVal(src.laundry_room), condVal(src.common_area), condVal(src.site_parking),
              condVal(src.other), src.general_notes, unitNum,
            ],
          );
          if (updated.rows[0]) created.push(updated.rows[0]);
        } else {
          const inserted = await client.query(
            `INSERT INTO field_unit_walk_rows (
               session_id, unit_number, unit_type, occupancy_status,
               kitchen, bathroom, flooring, appliances, hvac, windows,
               paint, plumbing, electrical, doors, exterior, roof,
               foundation, garage, landscaping, laundry_room,
               common_area, site_parking, other, general_notes,
               inspection_completed, created_at, updated_at
             ) VALUES (
               $1, $2, $3, $4,
               $5::unit_condition, $6::unit_condition, $7::unit_condition,
               $8::unit_condition, $9::unit_condition, $10::unit_condition,
               $11::unit_condition, $12::unit_condition, $13::unit_condition,
               $14::unit_condition, $15::unit_condition, $16::unit_condition,
               $17::unit_condition, $18::unit_condition, $19::unit_condition,
               $20::unit_condition, $21::unit_condition, $22::unit_condition,
               $23::unit_condition, $24, TRUE, NOW(), NOW()
             ) RETURNING *`,
            [
              sessionId, unitNum, src.unit_type, src.occupancy_status,
              condVal(src.kitchen), condVal(src.bathroom), condVal(src.flooring),
              condVal(src.appliances), condVal(src.hvac), condVal(src.windows),
              condVal(src.paint), condVal(src.plumbing), condVal(src.electrical),
              condVal(src.doors), condVal(src.exterior), condVal(src.roof),
              condVal(src.foundation), condVal(src.garage), condVal(src.landscaping),
              condVal(src.laundry_room), condVal(src.common_area), condVal(src.site_parking),
              condVal(src.other), src.general_notes,
            ],
          );
          if (inserted.rows[0]) created.push(inserted.rows[0]);
        }
      }

      if (created.length > 0) {
        await client.query(
          `UPDATE field_inspection_sessions
           SET units_walked = COALESCE(units_walked, 0) + $2,
               status = CASE WHEN status = 'planned' THEN 'in_progress' ELSE status END,
               sampling_confidence_score = CASE
                 WHEN total_units > 0
                 THEN LEAST(1.0, (COALESCE(units_walked, 0) + $2)::decimal / total_units::decimal)
                 ELSE 0 END,
               updated_at = NOW()
           WHERE id = $1`,
          [sessionId, created.length],
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return res.status(200).json({
      created: created.length,
      skipped: skipped.length,
      skippedUnits: skipped,
      rows: created,
    });
  } catch (error: any) {
    console.error('[replicate] error:', error?.message);
    return res.status(500).json({ error: 'Replication failed', details: error?.message });
  }
}
