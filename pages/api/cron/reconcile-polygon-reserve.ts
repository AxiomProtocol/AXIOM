/**
 * GET/POST /api/cron/reconcile-polygon-reserve
 *
 * Daily Polygon USDC reserve reconciliation cron.
 *
 * What it does:
 *   1. Gates on CHAIN_POLYGON_ENABLED=true — returns 200 {status:'BLOCKED'} if not set,
 *      so Vercel doesn't flag the cron as failed during pre-activation development.
 *   2. Reads native USDC balance of POLYGON_TREASURY_WALLET on Polygon PoS mainnet.
 *   3. Compares against capinfra DB SETTLED POLYGON TRANSFER movements.
 *   4. Writes a JSON report to documents/operations/reconciliation-reports/polygon-YYYY-MM-DD.json.
 *   5. Returns {ok:true, status:..., discrepancy:...} on success.
 *   6. Returns 500 on ERROR / ANOMALY status so Vercel cron monitoring detects failures.
 *
 * Auth: ADMIN_SOLVENCY_KEY or CRON_SECRET required on every call.
 *   Vercel sends Authorization: Bearer <CRON_SECRET> automatically when CRON_SECRET is set.
 *   The x-vercel-cron header is NOT used as a bypass — this route writes to disk.
 *
 * Schedule: daily at 02:00 UTC (see vercel.json crons block)
 *
 * Required env vars (production):
 *   CHAIN_POLYGON_ENABLED=true
 *   POLYGON_RPC_URL            — Polygon PoS mainnet RPC
 *   POLYGON_TREASURY_WALLET    — 0x… BitGo custody wallet address
 *   ADMIN_SOLVENCY_KEY or CRON_SECRET  — auth token
 *
 * Returns 200 with status=BLOCKED if CHAIN_POLYGON_ENABLED is not "true".
 * Returns 500 if status is ERROR or ANOMALY.
 * Returns 200 if status is CLEAN or WARNING.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';

function safeEqualStr(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  const adminKey   = process.env.ADMIN_SOLVENCY_KEY;
  const cronSecret = process.env.CRON_SECRET;
  const expected   = cronSecret || adminKey;

  if (!expected) {
    return res.status(503).json({
      ok: false,
      error: 'ADMIN_SOLVENCY_KEY (or CRON_SECRET) is not configured.',
    });
  }

  const bearer    = (req.headers['authorization'] || '').toString().replace(/^Bearer\s+/i, '');
  const headerKey = (req.headers['x-cron-secret'] || '').toString();
  const queryKey  = (req.query.key as string) || '';
  const provided  = bearer || headerKey || queryKey;

  if (!provided || !safeEqualStr(provided, expected)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const start = Date.now();

  try {
    const { runPolygonReconcile } = await import('../../../lib/capinfra/reconciliation/polygonReconcile');

    const networkRaw = (req.query.network as string) || 'mainnet';
    const network    = networkRaw === 'amoy' ? 'amoy' : 'mainnet';

    const result = await runPolygonReconcile({
      network,
      writeReport: true,
    });

    const elapsedMs = Date.now() - start;

    if (result.status === 'BLOCKED') {
      return res.status(200).json({
        ok:          true,
        status:      'BLOCKED',
        blockers:    result.blockers,
        elapsedMs,
        note: 'CHAIN_POLYGON_ENABLED is not set — Polygon reconciliation not yet active. ' +
              'This is expected pre-activation. No action required.',
      });
    }

    if (result.status === 'ERROR' || result.status === 'ANOMALY') {
      console.error('[cron/reconcile-polygon-reserve] Status:', result.status, result.blockers);
      return res.status(500).json({
        ok:                     false,
        status:                 result.status,
        blockers:               result.blockers,
        notes:                  result.notes,
        onChainBalanceHuman:    result.onChainBalanceHuman,
        capinfraNetMovementRaw: result.capinfraNetMovementRaw,
        discrepancyHuman:       result.discrepancyHuman,
        reportPath:             result.reportPath,
        elapsedMs,
      });
    }

    return res.status(200).json({
      ok:                     true,
      status:                 result.status,
      network:                result.network,
      date:                   result.date,
      onChainBalanceHuman:    result.onChainBalanceHuman,
      capinfraNetMovementRaw: result.capinfraNetMovementRaw,
      discrepancyHuman:       result.discrepancyHuman,
      treasuryWallet:         result.treasuryWallet,
      chainId:                result.chainId,
      reportPath:             result.reportPath,
      notes:                  result.notes,
      elapsedMs,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; stack?: string };
    console.error('[cron/reconcile-polygon-reserve] fatal:', e?.message, e?.stack);
    return res.status(500).json({
      ok:        false,
      error:     e?.message ?? 'Reconciliation failed unexpectedly',
      elapsedMs: Date.now() - start,
    });
  }
}
