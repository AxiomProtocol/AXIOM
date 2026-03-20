import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { property_type, system, region } = req.query;
  const client = await pool.connect();
  try {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (property_type && property_type !== 'both') {
      conditions.push(`(property_type = $${idx} OR property_type = 'both')`);
      values.push(property_type); idx++;
    }
    if (system) {
      conditions.push(`system = $${idx}`);
      values.push(system); idx++;
    }
    if (region) {
      conditions.push(`region = $${idx}`);
      values.push(region); idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await client.query(
      `SELECT * FROM rehab_cost_benchmarks ${where} ORDER BY system, condition_level`,
      values
    );

    const grouped: Record<string, Record<string, any>> = {};
    for (const row of rows) {
      if (!grouped[row.system]) grouped[row.system] = {};
      grouped[row.system][row.condition_level] = {
        cost_unit: row.cost_unit,
        cost_low: parseFloat(row.cost_low),
        cost_mid: parseFloat(row.cost_mid),
        cost_high: parseFloat(row.cost_high),
        notes: row.notes,
        source: row.source,
      };
    }

    res.json({ benchmarks: grouped, rows });
  } finally {
    client.release();
  }
}
