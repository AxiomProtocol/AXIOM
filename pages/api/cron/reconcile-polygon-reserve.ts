/**
 * GET/POST /api/cron/reconcile-polygon-reserve
 *
 * Daily Polygon USDC reserve reconciliation cron.
 *
 * What it does:
 *   1. Gates on CHAIN_POLYGON_ENABLED=true — returns 200 {status:'BLOCKED'} if not set,
 *      so Vercel does not flag the cron as failed during pre-activation development.
 *   2. Reads native USDC balance of POLYGON_TREASURY_WALLET on Polygon PoS mainnet.
 *   3. Compares against capinfra DB SETTLED POLYGON TRANSFER movements.
 *   4. Returns {ok:true, status:..., discrepancy:...} on success.
 *   5. Returns 500 on ERROR / ANOMALY status so Vercel cron monitoring detects failures.
 *
 * NOTE: Report writing is intentionally disabled in this API route.
 * Vercel serverless functions have a read-only filesystem (EROFS) — writing to
 * documents/operations/reconciliation-reports/ will fail. Results are returned
 * as JSON in the response and are persisted in Vercel's function logs.
 * To write a local report file, use the CLI script instead:
 *   npx tsx scripts/reconcile-polygon-reserve.ts
 *
 * Auth: CRON_SECRET or ADMIN_SOLVENCY_KEY required on every call.
 *   Vercel sends Authorization: Bearer <CRON_SECRET> automatically when configured.
 *   Both secrets are accepted independently — either one grants access.
 *   Uses the same isAuthorized() pattern as /api/cron/reserve-snapshot.
 *
 * Schedule: daily at 02:00 UTC (see vercel.json crons block)
 *
 * Required env vars (production):
 *   CHAIN_POLYGON_ENABLED=true
 *   POLYGON_RPC_URL            — Polygon PoS mainnet RPC
 *   POLYGON_TREASURY_WALLET    — 0x… BitGo custody wallet address
 *   CRON_SECRET or ADMIN_SOLVENCY_KEY  — auth token(s)
 *
 * Returns 200 with status=BLOCKED if CHAIN_POLYGON_ENABLED is not "true".
 * Returns 500 if status is ERROR or ANOMALY.
 * Returns 200 if status is CLEAN, WARNING, or BLOCKED.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';

function safeEqualStr(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

function isAuthorized(req: NextApiRequest): boolean {
  const cronSecret  = process.env.CRON_SECRET ?? '';
  const solvencyKey = process.env.ADMIN_SOLVENCY_KEY ?? '';
  const validSecrets = [cronSecret, solvencyKey].filter(Boolean);
  if (validSecrets.length === 0) return false;

  const bearer = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const header = (req.headers['x-cron-secret'] as string) ?? '';
  const query  = (req.query.key as string) ?? '';

  return validSecrets.some(
    secret =>
      (bearer && safeEqualStr(bearer, secret)) ||
      (header && safeEqualStr(header, secret)) ||
      (query  && safeEqualStr(query,  secret)),
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  if (!isAuthorized(req)) {
    const hasCreds = !!(process.env.CRON_SECRET || process.env.ADMIN_SOLVENCY_KEY);
    return res.status(hasCreds ? 401 : 503).json({
      ok:    false,
      error: hasCreds
        ? 'Unauthorized'
        : 'CRON_SECRET (or ADMIN_SOLVENCY_KEY) is not configured.',
    });
  }

  const start = Date.now();

  try {
    const { runPolygonReconcile } = await import('../../../lib/capinfra/reconciliation/polygonReconcile');

    const networkRaw = (req.query.network as string) || 'mainnet';
    const network    = networkRaw === 'amoy' ? 'amoy' : 'mainnet';

    // writeReport is false: Vercel serverless has a read-only filesystem.
    // Results are returned in the response and persisted in Vercel function logs.
    // Run `npx tsx scripts/reconcile-polygon-reserve.ts` locally to write report files.
    const result = await runPolygonReconcile({
      network,
      writeReport: false,
    });

    const elapsedMs = Date.now() - start;

    if (result.status === 'BLOCKED') {
      return res.status(200).json({
        ok:       true,
        status:   'BLOCKED',
        blockers: result.blockers,
        elapsedMs,
        note: 'CHAIN_POLYGON_ENABLED is not set — Polygon reconciliation not yet active. ' +
              'This is expected pre-activation. No action required.',
      });
    }

    if (result.status === 'ERROR' || result.status === 'ANOMALY') {
      console.error('[cron/reconcile-polygon-reserve] status=%s blockers=%j notes=%j',
        result.status, result.blockers, result.notes);
      return res.status(500).json({
        ok:                     false,
        status:                 result.status,
        blockers:               result.blockers,
        notes:                  result.notes,
        onChainBalanceHuman:    result.onChainBalanceHuman,
        capinfraNetMovementRaw: result.capinfraNetMovementRaw,
        discrepancyHuman:       result.discrepancyHuman,
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
      notes:                  result.notes,
      elapsedMs,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; stack?: string };
    console.error('[cron/reconcile-polygon-reserve] fatal: %s %s', e?.message, e?.stack);
    return res.status(500).json({
      ok:        false,
      error:     e?.message ?? 'Reconciliation failed unexpectedly',
      elapsedMs: Date.now() - start,
    });
  }
}
