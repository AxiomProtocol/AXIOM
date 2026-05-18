/**
 * GET /api/cron/harvest-vault
 *
 * Scheduled cron that automatically sweeps accrued Aave v3 yield back into
 * the AxiomTreasuryVault without operator intervention.
 *
 * Auth: every call must provide CRON_SECRET (preferred) or HARVEST_CRON_SECRET
 * via one of:
 *   Authorization: Bearer <secret>
 *   x-cron-secret: <secret>
 *   ?key=<secret>
 * When CRON_SECRET is set in Vercel env vars, the Vercel scheduler sends it
 * automatically as Authorization: Bearer <CRON_SECRET>.
 *
 * Guard rails (inherited from harvestRunner):
 *   - Reads on-chain yield BEFORE submitting any transaction.
 *   - Enforces minimum threshold (env HARVEST_MIN_USDC, default $1.00).
 *   - Realized yield parsed from StrategyHarvested event in receipt.
 *
 * Each run is recorded in harvest_cron_runs for operator visibility.
 *
 * Schedule: every 6 hours — see vercel.json crons block.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';
import { db } from '../../../server/db';
import { harvestCronRuns } from '../../../shared/treasuryVaultSchema';
import { runHarvest } from '../../../lib/treasury/vault/harvestRunner';

function safeEqualStr(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Accepts only dedicated cron secrets — no query-string key, no admin key
 * fallback. Least-privilege: this endpoint executes on-chain transactions
 * and must not accept a broader admin credential via an easily spoofable path.
 *
 * Accepted methods:
 *   Authorization: Bearer <CRON_SECRET>       (Vercel scheduler automatic)
 *   x-cron-secret: <CRON_SECRET|HARVEST_CRON_SECRET>  (direct callers)
 */
function isAuthorized(req: NextApiRequest): boolean {
  const cronSecret    = process.env.CRON_SECRET         ?? '';
  const harvestSecret = process.env.HARVEST_CRON_SECRET ?? '';

  const validSecrets = [cronSecret, harvestSecret].filter(Boolean);
  if (validSecrets.length === 0) return false;

  const bearer = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const header = (req.headers['x-cron-secret'] as string) ?? '';

  return validSecrets.some(
    (secret) =>
      (bearer && safeEqualStr(bearer, secret)) ||
      (header && safeEqualStr(header, secret)),
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized — provide CRON_SECRET or HARVEST_CRON_SECRET' });
  }

  const startedAt = new Date();
  const startMs   = Date.now();

  try {
    const result = await runHarvest('cron');

    const durationMs = Date.now() - startMs;

    // Record run in harvest_cron_runs regardless of outcome.
    await db.insert(harvestCronRuns).values({
      startedAt,
      completedAt: new Date(),
      status:      result.status,
      yieldUsdc:   result.yieldUsdc.toFixed(6),
      txHash:      result.txHash,
      errorMessage: result.errorMessage ?? result.skipReason ?? null,
      durationMs,
    });

    console.log(`[cron/harvest-vault] status=${result.status} yield=${result.yieldUsdc.toFixed(6)} durationMs=${durationMs}`);

    return res.status(200).json({
      ok:        result.status !== 'error',
      status:    result.status,
      yieldUsdc: result.yieldUsdc,
      txHash:    result.txHash,
      reason:    result.skipReason ?? null,
      error:     result.errorMessage ?? null,
      durationMs,
    });
  } catch (err: unknown) {
    const durationMs = Date.now() - startMs;
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cron/harvest-vault] Fatal error:', msg);

    // Best-effort DB log for unexpected errors.
    try {
      await db.insert(harvestCronRuns).values({
        startedAt,
        completedAt:  new Date(),
        status:       'error',
        yieldUsdc:    '0',
        txHash:       null,
        errorMessage: msg,
        durationMs,
      });
    } catch {
      // DB logging failure must not shadow the original error response.
    }

    return res.status(500).json({ ok: false, status: 'error', error: msg, durationMs });
  }
}
