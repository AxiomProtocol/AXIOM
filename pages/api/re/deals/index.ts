import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STRATEGIES = ['brrrr', 'flip', 'hold', 'note', 'multifamily'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const { property_id, deal_name, strategy, target_purchase_price, created_by_wallet } =
    req.body || {};

  if (typeof property_id !== 'string' || !UUID_RE.test(property_id)) {
    return res.status(400).json({ error: { message: 'Invalid property_id.' } });
  }
  if (typeof deal_name !== 'string' || !deal_name.trim()) {
    return res.status(400).json({ error: { message: 'deal_name is required.' } });
  }
  if (!VALID_STRATEGIES.includes(strategy)) {
    return res.status(400).json({ error: { message: 'Invalid strategy.' } });
  }

  try {
    const propCheck = await pool.query(
      'SELECT id FROM re_properties WHERE id = $1 AND is_active = true',
      [property_id]
    );
    if (propCheck.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Property not found.' } });
    }

    const price =
      target_purchase_price !== null && target_purchase_price !== undefined
        ? parseFloat(String(target_purchase_price)) || null
        : null;

    const wallet =
      typeof created_by_wallet === 'string' && created_by_wallet.startsWith('0x')
        ? created_by_wallet.slice(0, 42)
        : null;

    const result = await pool.query(
      `INSERT INTO re_deals (id, property_id, deal_name, strategy, status,
                              target_purchase_price, created_by_wallet)
       VALUES (gen_random_uuid(), $1, $2, $3, 'draft', $4, $5)
       RETURNING id`,
      [property_id, deal_name.trim(), strategy, price, wallet]
    );

    return res.status(200).json({ data: { id: result.rows[0].id } });
  } catch (error: any) {
    console.error('[api/re/deals]', error);
    return res.status(500).json({ error: { message: 'Failed to create deal.' } });
  }
}
