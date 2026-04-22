import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { createHash } from 'crypto';

function isAuthorized(req: NextApiRequest): boolean {
  const scanKey = process.env.MIRDT_SCAN_KEY;
  if (!scanKey) return process.env.NODE_ENV === 'development';
  return req.headers['x-scan-key'] === scanKey;
}

function computeChecksum(
  prevChecksum: string | null,
  eventType: string,
  dimension: string | null,
  grade: string,
  keyMetric: string | null,
  thesis: string | null,
  ts: string,
): string {
  const payload = [prevChecksum ?? '', eventType, dimension ?? '', grade, keyMetric ?? '', thesis ?? '', ts].join('|');
  return createHash('sha256').update(payload).digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT id, created_at, event_type, dimension, grade, key_metric, thesis, prs_score, checksum, prev_checksum
         FROM mirdt_signal_log
         ORDER BY created_at DESC
         LIMIT 50`
      );
      return res.status(200).json({
        events: result.rows.map((r) => ({
          id: r.id,
          loggedAt: r.created_at,
          eventType: r.event_type,
          dimension: r.dimension,
          grade: r.grade,
          keyMetric: r.key_metric,
          thesis: r.thesis,
          prsScore: r.prs_score,
          checksum: r.checksum,
          prevChecksum: r.prev_checksum,
        })),
      });
    } catch {
      return res.status(500).json({ error: 'Failed to read signal log' });
    }
  }

  if (req.method === 'POST') {
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: 'Unauthorized — write access requires authorization' });
    }

    try {
      const { eventType, dimension, grade, keyMetric, thesis, prsScore } = req.body as {
        eventType: string;
        dimension?: string;
        grade: string;
        keyMetric?: string;
        thesis?: string;
        prsScore?: number;
      };

      const validGrades = new Set(['A', 'B', 'C', 'WATCH', 'ALERT']);
      if (!eventType || !grade) {
        return res.status(400).json({ error: 'eventType and grade are required' });
      }
      if (!validGrades.has(grade)) {
        return res.status(400).json({ error: `Invalid grade: must be one of A, B, C, WATCH, ALERT` });
      }

      const prevResult = await pool.query(
        `SELECT checksum FROM mirdt_signal_log ORDER BY created_at DESC LIMIT 1`
      );
      const prevChecksum = prevResult.rows[0]?.checksum ?? null;
      const ts = new Date().toISOString();
      const checksum = computeChecksum(prevChecksum, eventType, dimension ?? null, grade, keyMetric ?? null, thesis ?? null, ts);

      const insert = await pool.query(
        `INSERT INTO mirdt_signal_log (event_type, dimension, grade, key_metric, thesis, prs_score, checksum, prev_checksum)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, created_at, checksum, prev_checksum`,
        [eventType, dimension ?? null, grade, keyMetric ?? null, thesis ?? null, prsScore ?? null, checksum, prevChecksum]
      );

      return res.status(201).json({
        id: insert.rows[0].id,
        loggedAt: insert.rows[0].created_at,
        checksum: insert.rows[0].checksum,
        prevChecksum: insert.rows[0].prev_checksum,
      });
    } catch {
      return res.status(500).json({ error: 'Failed to write signal log entry' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
