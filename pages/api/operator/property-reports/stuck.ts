/**
 * /api/operator/property-reports/stuck
 *
 * Operator-cookie authenticated surface for the task #248 stuck-payment
 * resolver.
 *
 *   GET   → list current pending property_reports older than the resolver
 *           threshold (with a recorded buyerWallet).
 *   POST  → trigger resolver actions:
 *             { mode: 'sweep' }                            → run resolveStuckPayments
 *             { mode: 'resolve', reportId, txHash }        → confirm one row by tx hash
 *             { mode: 'expire',  reportId }                → manually expire one row
 *
 * The cookie is the same `cap_operator_key` cookie set by the operator login
 * flow, validated against `ADMIN_SOLVENCY_KEY`.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { and, eq } from 'drizzle-orm';
import {
  isValidOperatorKey,
  readOperatorCookie,
} from '../../../../lib/capinfra/operatorAuth';
import {
  listStuckPending,
  resolveSingleByTxHash,
  resolveStuckPayments,
} from '../../../../lib/property/stuckPaymentResolver';
import { db } from '../../../../server/db';
import { propertyReports } from '../../../../shared/propertySchema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookieKey = readOperatorCookie(req);
  if (!isValidOperatorKey(cookieKey)) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  if (req.method === 'GET') {
    try {
      const rows = await listStuckPending();
      return res.status(200).json({
        rows: rows.map((r) => ({
          id: r.id,
          tier: r.tier,
          addressRaw: r.addressRaw,
          buyerWallet: r.buyerWallet,
          buyerEmail: r.buyerEmail,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
          amountPaidCents: r.amountPaidCents,
        })),
      });
    } catch (err) {
      console.error('[operator.property-reports.stuck] list failed', err);
      return res.status(500).json({ error: 'INTERNAL' });
    }
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const mode = String(body.mode ?? 'sweep');

    try {
      if (mode === 'sweep') {
        const summary = await resolveStuckPayments();
        return res.status(200).json({ ok: true, summary });
      }
      if (mode === 'resolve') {
        const reportId = String(body.reportId ?? '').trim();
        const txHash = String(body.txHash ?? '').trim();
        if (!reportId || !txHash) {
          return res.status(400).json({ error: 'reportId and txHash are required' });
        }
        const result = await resolveSingleByTxHash(reportId, txHash);
        if (!result.ok) return res.status(400).json({ error: result.reason });
        return res.status(200).json({ ok: true, status: result.status });
      }
      if (mode === 'expire') {
        const reportId = String(body.reportId ?? '').trim();
        if (!reportId) return res.status(400).json({ error: 'reportId is required' });
        const updated = await db
          .update(propertyReports)
          .set({
            status: 'expired',
            errorMessage: 'Manually expired by operator (no on-chain payment found).',
            updatedAt: new Date(),
          })
          .where(and(eq(propertyReports.id, reportId), eq(propertyReports.status, 'pending')))
          .returning({ id: propertyReports.id });
        if (updated.length === 0) {
          return res.status(404).json({ error: 'Report not found or no longer pending' });
        }
        return res.status(200).json({ ok: true, expired: updated[0].id });
      }
      return res.status(400).json({ error: `Unknown mode: ${mode}` });
    } catch (err) {
      console.error('[operator.property-reports.stuck] action failed', mode, err);
      return res.status(500).json({ error: 'INTERNAL' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
