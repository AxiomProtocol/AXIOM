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

  const { decision, rationale, decided_by } = req.body || {};
  if (typeof decision !== 'string' || !decision.trim()) {
    return res.status(400).json({ error: { message: 'decision is required.' } });
  }

  try {
    const dealCheck = await pool.query('SELECT id FROM re_deals WHERE id = $1', [id]);
    if (dealCheck.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Deal not found.' } });
    }

    const wallet =
      typeof decided_by === 'string' && decided_by.startsWith('0x')
        ? decided_by.slice(0, 42)
        : null;

    const ratText =
      typeof rationale === 'string' && rationale.trim() ? rationale.trim() : null;

    await pool.query(
      `INSERT INTO re_decision_log (id, deal_id, decided_by, decision, rationale)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
      [id, wallet, decision.trim(), ratText]
    );

    return res.status(200).json({ data: { recorded: true } });
  } catch (error: any) {
    console.error('[api/re/deals/[id]/decisions]', error);
    return res.status(500).json({ error: { message: 'Failed to record decision.' } });
  }
}
