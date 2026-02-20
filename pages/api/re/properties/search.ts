import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const q = ((req.query.q as string) || '').trim();
  const city = ((req.query.city as string) || '').trim();
  const state = ((req.query.state as string) || '').trim();
  const zip = ((req.query.zip as string) || '').trim();

  if (!q && !city && !state && !zip) {
    return res.status(400).json({ error: { message: 'Enter at least one search field.' } });
  }

  try {
    const conditions: string[] = ['is_active = true'];
    const params: any[] = [];
    let idx = 1;

    if (q) {
      const s = q.replace(/[%_\\]/g, '');
      if (s) {
        conditions.push(`(address_raw ILIKE $${idx} OR address_normalized ILIKE $${idx})`);
        params.push(`%${s}%`);
        idx++;
      }
    }

    if (city) {
      const s = city.replace(/[%_\\]/g, '');
      if (s) {
        conditions.push(`city ILIKE $${idx}`);
        params.push(`%${s}%`);
        idx++;
      }
    }

    if (state) {
      conditions.push(`state ILIKE $${idx}`);
      params.push(state.slice(0, 2));
      idx++;
    }

    if (zip) {
      const s = zip.replace(/[%_\\]/g, '');
      if (s) {
        conditions.push(`zip LIKE $${idx}`);
        params.push(`${s}%`);
        idx++;
      }
    }

    const where = conditions.join(' AND ');
    const result = await pool.query(
      `SELECT id, address_raw, address_normalized, city, state, zip, property_type, sqft, bedrooms, year_built
       FROM re_properties
       WHERE ${where}
       ORDER BY address_normalized ASC, address_raw ASC
       LIMIT 100`,
      params
    );

    return res.status(200).json({
      data: result.rows,
      meta: {
        as_of: new Date().toISOString().split('T')[0],
        confidence: 0.85,
      },
    });
  } catch (error: any) {
    console.error('[api/re/properties/search]', error);
    return res.status(500).json({ error: { message: 'Search failed.' } });
  }
}
