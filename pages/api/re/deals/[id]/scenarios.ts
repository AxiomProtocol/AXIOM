import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const { id } = req.query;
  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return res.status(400).json({ error: { message: 'Invalid deal ID.' } });
  }

  const { scenario_name, is_primary } = req.body || {};
  if (typeof scenario_name !== 'string' || !scenario_name.trim()) {
    return res.status(400).json({ error: { message: 'scenario_name is required.' } });
  }

  try {
    const dealCheck = await pool.query('SELECT id FROM re_deals WHERE id = $1', [id]);
    if (dealCheck.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Deal not found.' } });
    }

    const result = await pool.query(
      `INSERT INTO re_deal_scenarios (id, deal_id, scenario_name, is_primary)
       VALUES (gen_random_uuid(), $1, $2, $3)
       RETURNING id`,
      [id, scenario_name.trim(), Boolean(is_primary)]
    );

    return res.status(200).json({ data: { id: result.rows[0].id } });
  } catch (error: any) {
    console.error('[api/re/deals/[id]/scenarios]', error);
    return res.status(500).json({ error: { message: 'Failed to create scenario.' } });
  }
}
