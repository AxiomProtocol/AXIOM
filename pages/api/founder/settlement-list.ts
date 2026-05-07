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
  try {
    const r = await pool().query(`
      SELECT
        d.id, d.title, d.description, d.file_name, d.file_url, d.file_size, d.created_at,
        e.status         AS extraction_status,
        e.confidence     AS extraction_confidence,
        e.field_count    AS extraction_field_count,
        e.payload        AS extraction_payload,
        e.error          AS extraction_error,
        e.extracted_at   AS extraction_at
      FROM pilot_documents d
      LEFT JOIN pilot_settlement_extractions e ON e.document_id = d.id
      WHERE d.category = 'settlement_statement'
      ORDER BY d.created_at DESC
      LIMIT 200
    `);
    return res.status(200).json({ success: true, data: r.rows });
  } catch (err: any) {
    console.error('[settlement-list]', err?.message);
    return res.status(500).json({ success: false, error: err?.message ?? 'List failed' });
  }
}
