/**
 * GET /api/axiom-rail/settlements
 *
 * Returns all stellar_payment_transfers records for the Founder Ops
 * Axiom Rail settlements tab. Admin-key protected.
 *
 * Query params:
 *   status  — filter by status (optional)
 *   flow    — 'withdraw' | 'deposit' (optional)
 *   limit   — max records (default 100)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { stellarPaymentTransfers } from '../../../shared/stellarSchema';
import { eq, desc } from 'drizzle-orm';

function checkAdminKey(req: NextApiRequest): boolean {
  return req.headers['x-admin-key'] === process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAdminKey(req)) return res.status(401).json({ error: 'Unauthorized' });

  const limit = Math.min(parseInt(req.query.limit as string ?? '100', 10), 200);

  try {
    const rows = await db
      .select()
      .from(stellarPaymentTransfers)
      .orderBy(desc(stellarPaymentTransfers.initiatedAt))
      .limit(limit);

    const statusFilter = req.query.status as string | undefined;
    const flowFilter = req.query.flow as string | undefined;

    let filtered = rows;
    if (statusFilter) {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    if (flowFilter === 'withdraw') {
      filtered = filtered.filter(r => r.corridorId === 'usdc-to-usd-axiom-rail-rtp');
    } else if (flowFilter === 'deposit') {
      filtered = filtered.filter(r => r.corridorId === 'usd-to-usdc-axiom-rail-ach');
    }

    const summary = {
      total: rows.length,
      byStatus: {
        pending_user_transfer_start: rows.filter(r => r.status === 'pending_user_transfer_start').length,
        pending_external: rows.filter(r => r.status === 'pending_external').length,
        pending_anchor: rows.filter(r => r.status === 'pending_anchor').length,
        pending_stellar: rows.filter(r => r.status === 'pending_stellar').length,
        completed: rows.filter(r => r.status === 'completed').length,
        error: rows.filter(r => r.status === 'error').length,
      },
      byFlow: {
        withdraw: rows.filter(r => r.corridorId === 'usdc-to-usd-axiom-rail-rtp').length,
        deposit: rows.filter(r => r.corridorId === 'usd-to-usdc-axiom-rail-ach').length,
      },
    };

    return res.status(200).json({
      success: true,
      summary,
      data: filtered,
    });
  } catch (err: unknown) {
    console.error('[settlements] DB error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
