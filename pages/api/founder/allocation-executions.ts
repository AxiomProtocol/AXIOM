/**
 * GET /api/founder/allocation-executions?documentId=...
 *
 * Admin-key gated. Returns every recorded execution row for the given
 * settlement document, grouped by scope so the UI can show
 * "Already allocated on YYYY-MM-DD" banners and disable Execute buttons
 * that already fired.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { validateAdminKey } from '@/src/config/adminRoles';

let _pool: Pool | null = null;
const pool = () => (_pool ??= new Pool({ connectionString: process.env.DATABASE_URL }));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const documentId = String(req.query.documentId ?? '').trim();
  if (!documentId) {
    return res.status(400).json({ success: false, error: 'documentId query param is required' });
  }

  try {
    const rows = await pool().query(
      `SELECT id, document_id, scope, asset_key, rail,
              weight_pct::float AS weight_pct,
              usd_amount::float  AS usd_amount,
              scope_amount::float AS scope_amount,
              status, tx_hash, external_ref, external_url, note,
              executed_at, executed_by
         FROM pilot_allocation_executions
        WHERE document_id = $1
        ORDER BY executed_at ASC`,
      [documentId],
    );

    const executions = rows.rows.map(r => ({
      id: r.id,
      document_id: r.document_id,
      scope: r.scope,
      asset_key: r.asset_key,
      rail: r.rail,
      weight_pct: Number(r.weight_pct),
      usd_amount: Number(r.usd_amount),
      scope_amount: r.scope_amount != null ? Number(r.scope_amount) : null,
      status: r.status,
      tx_hash: r.tx_hash,
      external_ref: r.external_ref,
      external_url: r.external_url,
      note: r.note,
      executed_at: r.executed_at instanceof Date ? r.executed_at.toISOString() : String(r.executed_at),
      executed_by: r.executed_by,
    }));

    // Group by scope for convenience
    const byScope = {
      driver:   executions.filter(e => e.scope === 'driver'),
      treasury: executions.filter(e => e.scope === 'treasury'),
    };

    const firstExecAt = (s: 'driver' | 'treasury') => {
      const list = byScope[s];
      return list.length > 0 ? list[0].executed_at : null;
    };

    return res.status(200).json({
      success: true,
      executions,
      by_scope: byScope,
      first_executed_at: {
        driver:   firstExecAt('driver'),
        treasury: firstExecAt('treasury'),
      },
      total_count: executions.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load executions';
    console.error('[allocation-executions]', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
