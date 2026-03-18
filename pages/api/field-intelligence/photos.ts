import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { type File as FormidableFile } from 'formidable';
import { pool } from '../../../server/db';

export const config = {
  api: {
    bodyParser: false,
  },
};

type ParsedForm = {
  fields: Record<string, string | string[] | undefined>;
  files: Record<string, FormidableFile | FormidableFile[] | undefined>;
};

function parseForm(req: NextApiRequest): Promise<ParsedForm> {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, keepExtensions: true });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

function firstField(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function firstFile(value: FormidableFile | FormidableFile[] | undefined): FormidableFile | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      const { fields, files } = await parseForm(req);
      const file = firstFile(files.file);
      const unitWalkId = firstField(fields.unitWalkId);

      if (!file || !unitWalkId) {
        return res.status(400).json({ error: 'file and unitWalkId are required' });
      }

      const walk = await pool.query(
        `SELECT id FROM field_unit_walk_rows WHERE id = $1 LIMIT 1`,
        [unitWalkId],
      );
      if (!walk.rows.length) {
        return res.status(404).json({ error: 'Unit walk not found' });
      }

      const photoType = firstField(fields.photoType) || 'general';
      const system = firstField(fields.system);
      const isBefore = firstField(fields.isBefore) === 'true';
      const caption = firstField(fields.caption);
      const gpsRaw = firstField(fields.gpsCoordinates);
      const rawTimestamp = firstField(fields.timestamp);
      const gpsCoordinates = gpsRaw
        ? (() => {
            try {
              return JSON.parse(gpsRaw);
            } catch {
              return { raw: gpsRaw };
            }
          })()
        : null;

      const generatedName = `${unitWalkId}_${Date.now()}_${file.originalFilename || 'upload'}`;
      const fileUrl = `/uploads/field-photos/${generatedName}`;

      const inserted = await pool.query(
        `INSERT INTO field_unit_walk_photos (
           unit_walk_id,
           photo_type,
           system,
           is_before,
           file_name,
           file_url,
           file_size,
           mime_type,
           caption,
           timestamp,
           gps_coordinates,
           meta,
           created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
         RETURNING *`,
        [
          unitWalkId,
          photoType,
          system,
          isBefore,
          generatedName,
          fileUrl,
          file.size || null,
          file.mimetype || null,
          caption,
          rawTimestamp ? new Date(rawTimestamp) : new Date(),
          gpsCoordinates,
          {
            uploadedAt: new Date().toISOString(),
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
         FROM field_unit_walk_photos
         WHERE unit_walk_id = $1
         ORDER BY created_at ASC`,
        [unitWalkId],
      );

      return res.status(200).json(rows.rows);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to process photos request',
      details: error?.message || String(error),
    });
  }
}
