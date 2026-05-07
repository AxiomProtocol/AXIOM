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
    // Summary-only response (no payload). The full extracted JSON is fetched
    // on-demand from /api/founder/settlement-extraction?id=... when the
    // operator opens the detail panel.
    const r = await pool().query(`
      SELECT
        d.id, d.title, d.description, d.file_name, d.file_url, d.file_size, d.created_at,
        e.status         AS extraction_status,
        e.confidence     AS extraction_confidence,
        e.field_count    AS extraction_field_count,
        e.error          AS extraction_error,
        e.extracted_at   AS extraction_at,
        e.payload->>'statement_date'           AS payload_statement_date,
        e.payload->>'unit_number'              AS payload_unit_number,
        e.payload->>'driver_name'              AS payload_driver_name,
        (e.payload->>'total_miles')::numeric            AS payload_total_miles,
        (e.payload->>'loaded_miles')::numeric           AS payload_loaded_miles,
        (e.payload->>'empty_miles')::numeric            AS payload_empty_miles,
        (e.payload->>'mileage_pay_current')::numeric    AS payload_mileage_pay_current,
        (e.payload->>'reimbursements_current')::numeric AS payload_reimbursements_current,
        (e.payload->>'fuel_protection_current')::numeric AS payload_fuel_protection_current,
        (e.payload->>'total_gross_pay_current')::numeric AS payload_total_gross_pay_current,
        (e.payload->>'total_deductions_current')::numeric AS payload_total_deductions_current,
        (e.payload->>'total_net_pay_current')::numeric  AS payload_total_net_pay_current
      FROM pilot_documents d
      LEFT JOIN pilot_settlement_extractions e ON e.document_id = d.id
      WHERE d.category = 'settlement_statement'
      ORDER BY d.created_at DESC
      LIMIT 200
    `);
    return res.status(200).json({ success: true, data: r.rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'List failed';
    console.error('[settlement-list]', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
