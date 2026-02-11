import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import crypto from 'crypto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  const providedKey = req.headers['x-admin-key'] as string;

  if (!adminKey || providedKey !== adminKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { payloadJson, notes, asOfUtc } = req.body;

    if (!payloadJson || typeof payloadJson !== 'object') {
      return res.status(400).json({ error: 'payloadJson is required and must be an object' });
    }

    const payloadStr = JSON.stringify(payloadJson);
    const checksum = crypto
      .createHash('sha256')
      .update(payloadStr)
      .digest('hex')
      .slice(0, 16);

    const timestamp = asOfUtc ? new Date(asOfUtc).toISOString() : new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO solvency_snapshots (id, created_at, as_of_utc, payload_json, checksum, notes)
       VALUES (gen_random_uuid(), NOW(), $1, $2::jsonb, $3, $4)
       RETURNING id, created_at, checksum`,
      [timestamp, payloadStr, checksum, notes || null]
    );

    const row = result.rows[0];

    return res.status(201).json({
      success: true,
      snapshotId: row.id,
      checksum: row.checksum,
      createdAt: row.created_at,
    });
  } catch (error: any) {
    console.error('[solvency/ingest-snapshot] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
