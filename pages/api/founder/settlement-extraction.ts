import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { validateAdminKey } from '../../../src/config/adminRoles';

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return _pool;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized — x-admin-key required' });
  }
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing document id' });
  }
  try {
    const r = await pool().query(
      `SELECT document_id, status, confidence, field_count, processing_time_ms, payload, error, extracted_at
         FROM pilot_settlement_extractions WHERE document_id = $1`,
      [id]
    );
    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No extraction found for this document.' });
    }
    return res.status(200).json({ success: true, data: r.rows[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lookup failed';
    console.error('[settlement-extraction]', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
