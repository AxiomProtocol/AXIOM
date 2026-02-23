import type { NextApiRequest, NextApiResponse } from 'next';
import { isCapitalAuthorized, buildMeta } from '../../../../../lib/capital/apiAuth';
import { Pool } from 'pg';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isCapitalAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? true : undefined,
    max: 2,
  });

  try {
    const { marks } = req.body;
    if (!Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({ error: 'marks array required' });
    }

    const results = [];
    for (const mark of marks) {
      const { instrument, price, source } = mark;
      if (!instrument || price === undefined) {
        results.push({ error: 'instrument and price required', mark });
        continue;
      }

      const { rows: [row] } = await pool.query(`
        INSERT INTO cap_price_marks (instrument, price, source, marked_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id
      `, [instrument, price, source || 'MANUAL']);

      results.push({ id: row.id, instrument, price });
    }

    return res.status(201).json({
      data: { results, count: results.filter(r => r.id).length },
      meta: buildMeta(['PRICE_MARKS'], []),
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
      meta: buildMeta([], [err.message], 'LOW'),
    });
  } finally {
    await pool.end();
  }
}
