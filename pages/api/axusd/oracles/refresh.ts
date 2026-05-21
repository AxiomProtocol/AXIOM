/**
 * GET  /api/axusd/oracles/refresh — Returns last poll summary + cache stats
 * POST /api/axusd/oracles/refresh — Triggers a fresh NAV poll for all PLANNED assets
 *
 * POST ?force=true   — bypasses cache TTL and re-fetches all sources immediately
 *
 * This endpoint doubles as the target for Vercel Cron Jobs (cron.json).
 * The cron scheduler calls POST every 5 minutes; the handler internally
 * respects per-asset TTLs so only stale entries trigger actual HTTP/RPC calls.
 *
 * Authorization:
 *   GET  — public (returns sanitized summary, no raw prices)
 *   POST — requires ADMIN_SOLVENCY_KEY header OR internal cron secret
 *          X-Axiom-Cron-Secret must match AXIOM_CRON_SECRET env var (if set)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { refreshAllObservations, getLastPollSummary } from '../../../../lib/reserves/phase3/navPollingService';
import { getCacheStats } from '../../../../lib/reserves/phase3/navObservationCache';

function isAuthorized(req: NextApiRequest): boolean {
  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  const cronSecret = process.env.AXIOM_CRON_SECRET;
  const providedAdmin = req.headers['x-admin-key'];
  const providedCron = req.headers['x-axiom-cron-secret'];

  if (cronSecret && providedCron === cronSecret) return true;
  if (adminKey && providedAdmin === adminKey) return true;
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const summary = getLastPollSummary();
    const cacheStats = getCacheStats();

    return res.status(200).json({
      fetchedAt: new Date().toISOString(),
      lastPoll: summary
        ? {
            startedAt: summary.startedAt,
            completedAt: summary.completedAt,
            durationMs: summary.durationMs,
            successCount: summary.successCount,
            failureCount: summary.failureCount,
            assets: summary.results.map(r => ({
              assetId: r.assetId,
              success: r.success,
              source: r.source,
              confidenceScore: r.confidenceScore,
              fetchedAt: r.fetchedAt,
              error: r.error ?? null,
            })),
          }
        : null,
      cache: cacheStats,
    });
  }

  if (req.method === 'POST') {
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: 'Unauthorized. Provide X-Admin-Key header.' });
    }

    const force = req.query.force === 'true';

    try {
      const summary = await refreshAllObservations({ force });
      return res.status(200).json({
        refreshedAt: new Date().toISOString(),
        durationMs: summary.durationMs,
        successCount: summary.successCount,
        failureCount: summary.failureCount,
        results: summary.results.map(r => ({
          assetId: r.assetId,
          success: r.success,
          source: r.source,
          nav: r.success ? r.nav : null,
          confidenceScore: r.confidenceScore,
          error: r.error ?? null,
        })),
        cache: getCacheStats(),
      });
    } catch (err) {
      console.error('[OracleRefresh] Poll failed:', err);
      return res.status(500).json({
        error: 'Oracle refresh failed',
        message: (err as Error).message,
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
