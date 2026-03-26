import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { createHash } from 'crypto';

interface BriefPayload {
  dimension: string;
  grade: string;
  keyMetric: string;
  thesis: string;
  prsScore?: number | null;
}

function validatePayload(body: unknown): body is BriefPayload {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.dimension === 'string' && b.dimension.length > 0 &&
    typeof b.grade === 'string' && b.grade.length > 0 &&
    typeof b.keyMetric === 'string' && b.keyMetric.length > 0 &&
    typeof b.thesis === 'string' && b.thesis.length > 0
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!validatePayload(req.body)) {
    return res.status(400).json({ error: 'Missing required fields: dimension, grade, keyMetric, thesis' });
  }

  const { dimension, grade, keyMetric, thesis, prsScore } = req.body;

  try {
    const prevResult = await pool.query(
      `SELECT checksum FROM mirdt_signal_log ORDER BY created_at DESC LIMIT 1`
    );
    const prevChecksum: string | null = prevResult.rows[0]?.checksum ?? null;
    const ts = new Date().toISOString();
    const payload = [prevChecksum ?? '', 'BRIEF_LOGGED', dimension, grade, keyMetric, thesis, ts].join('|');
    const checksum = createHash('sha256').update(payload).digest('hex');

    const signalInsert = await pool.query(
      `INSERT INTO mirdt_signal_log (event_type, dimension, grade, key_metric, thesis, prs_score, checksum, prev_checksum)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at, checksum, prev_checksum`,
      ['BRIEF_LOGGED', dimension, grade, keyMetric, thesis, prsScore ?? null, checksum, prevChecksum]
    );

    const title = `[MIRDT] ${dimension} — Grade ${grade}`;
    const description = `Capital Intelligence Brief. Key Metric: ${keyMetric}. Signal Thesis: ${thesis}. PRS: ${prsScore ?? 'N/A'}. Checksum: ${checksum.slice(0, 12)}…`;

    await pool.query(
      `INSERT INTO founder_ops_log (week, phase, category, title, description, product, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [0, 0, 'capital-intelligence', title, description, 'MIRDT', 'completed']
    );

    return res.status(201).json({
      id: signalInsert.rows[0].id,
      loggedAt: signalInsert.rows[0].created_at,
      checksum: signalInsert.rows[0].checksum,
      prevChecksum: signalInsert.rows[0].prev_checksum,
      dimension,
      grade,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: `Failed to log brief: ${message}` });
  }
}
