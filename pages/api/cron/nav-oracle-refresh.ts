/**
 * GET /api/cron/nav-oracle-refresh
 *
 * Scheduled cron job (every 5 minutes) that refreshes NAV observations for all
 * PLANNED oracle assets: PAXG (Chainlink XAU/USD + BitGo attestation),
 * thBILL (Theo Market), BUIDL (BlackRock), USDY (Ondo Finance).
 *
 * Each oracle source respects its own cache TTL, so not every invocation
 * triggers an external HTTP/RPC call — only entries that have expired are
 * re-fetched. This means:
 *   - Chainlink XAU/USD: re-fetched every 5 min (TTL = 5 min)
 *   - Issuer NAV APIs:    re-fetched every 60 min (TTL = 1 hr)
 *   - BitGo attestation:  re-fetched every 6 hr (TTL = 6 hr)
 *
 * Auth: CRON_SECRET (Authorization: Bearer) or ADMIN_SOLVENCY_KEY (x-admin-key).
 * When CRON_SECRET is set in Vercel env vars, the scheduler sends it automatically.
 *
 * Schedule: *\/5 * * * * (see vercel.json crons block)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';
import { refreshAllObservations, getLastPollSummary } from '../../../lib/reserves/phase3/navPollingService';
import { getCacheStats } from '../../../lib/reserves/phase3/navObservationCache';

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
  const cronSecret   = process.env.CRON_SECRET;
  const adminKey     = process.env.ADMIN_SOLVENCY_KEY;

  const authHeader   = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const cronHeader   = req.headers['x-cron-secret'] as string | undefined;
  const adminHeader  = req.headers['x-admin-key'] as string | undefined;
  const queryKey     = req.query.key as string | undefined;

  if (cronSecret) {
    if (authHeader   && safeEqualStr(authHeader,  cronSecret)) return true;
    if (cronHeader   && safeEqualStr(cronHeader,  cronSecret)) return true;
    if (queryKey     && safeEqualStr(queryKey,    cronSecret)) return true;
  }

  if (adminKey) {
    if (adminHeader  && safeEqualStr(adminHeader, adminKey))   return true;
    if (queryKey     && safeEqualStr(queryKey,    adminKey))   return true;
  }

  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startedAt = new Date().toISOString();

  try {
    const summary = await refreshAllObservations({ force: false });
    const cache = getCacheStats();

    console.log(
      `[nav-oracle-refresh] Cron completed in ${summary.durationMs}ms — ` +
      `${summary.successCount} succeeded, ${summary.failureCount} failed`
    );

    return res.status(200).json({
      ok: true,
      startedAt,
      completedAt: summary.completedAt,
      durationMs: summary.durationMs,
      successCount: summary.successCount,
      failureCount: summary.failureCount,
      results: summary.results.map(r => ({
        assetId: r.assetId,
        success: r.success,
        source: r.source,
        confidenceScore: r.confidenceScore,
        error: r.error ?? null,
      })),
      cacheEntries: cache.entries,
      cacheFresh: cache.fresh,
    });
  } catch (err) {
    console.error('[nav-oracle-refresh] Cron failed:', err);
    return res.status(500).json({
      ok: false,
      startedAt,
      error: 'NAV oracle refresh cron failed',
      message: (err as Error).message,
    });
  }
}
