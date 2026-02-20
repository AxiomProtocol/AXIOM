import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const { id } = req.query;
  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return res.status(400).json({ error: { message: 'Invalid property ID.' } });
  }

  try {
    const propResult = await pool.query(
      `SELECT id, address_raw, address_normalized, city, state, zip, county,
              property_type, year_built, sqft, lot_sqft, bedrooms, bathrooms,
              zoning, apn, lat, lon
       FROM re_properties
       WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (propResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Property not found.' } });
    }

    const [salesResult, taxesResult, factsResult] = await Promise.all([
      pool.query(
        `SELECT id, sale_date, sale_price, price_per_sqft, buyer, seller, deed_type, is_arms_length
         FROM re_sales
         WHERE property_id = $1
         ORDER BY sale_date DESC
         LIMIT 50`,
        [id]
      ),
      pool.query(
        `SELECT id, tax_year, assessed_total, market_value, tax_amount, tax_rate
         FROM re_taxes
         WHERE property_id = $1
         ORDER BY tax_year DESC
         LIMIT 20`,
        [id]
      ),
      pool.query(
        `SELECT id, fact_type, fact_value, fact_numeric, as_of, confidence
         FROM re_property_facts
         WHERE property_id = $1
         ORDER BY as_of DESC NULLS LAST, created_at DESC
         LIMIT 100`,
        [id]
      ),
    ]);

    return res.status(200).json({
      data: {
        property: propResult.rows[0],
        sales: salesResult.rows,
        taxes: taxesResult.rows,
        facts: factsResult.rows,
      },
      meta: {
        as_of: new Date().toISOString().split('T')[0],
        confidence: 0.85,
      },
    });
  } catch (error: any) {
    console.error('[api/re/properties/[id]]', error);
    return res.status(500).json({ error: { message: 'Failed to load property.' } });
  }
}
