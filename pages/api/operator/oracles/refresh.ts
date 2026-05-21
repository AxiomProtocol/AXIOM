/**
 * POST /api/operator/oracles/refresh
 *
 * Operator-authenticated proxy for triggering a fresh NAV oracle poll.
 * Requires the operator session cookie (cap_operator_key) set by /operator/login.
 *
 * This proxy exists so the browser-side "Refresh Now" button can call a
 * cookie-auth endpoint without exposing ADMIN_SOLVENCY_KEY to client-side JS.
 *
 * Query params:
 *   ?force=true  — bypass per-asset cache TTLs and re-fetch everything immediately
 *                  (defaults to true for manual operator refreshes)
 *
 * Delegates to refreshAllObservations() in navPollingService.ts.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  readOperatorCookie,
  isValidOperatorKey,
} from '../../../../lib/capinfra/operatorAuth';
import { refreshAllObservations } from '../../../../lib/reserves/phase3/navPollingService';
import { getCacheStats } from '../../../../lib/reserves/phase3/navObservationCache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const provided = readOperatorCookie(req);
  if (!isValidOperatorKey(provided)) {
    return res.status(401).json({ error: 'Unauthorized — operator session required' });
  }

  // Default force=true for manual operator-initiated refreshes; pass ?force=false to respect TTLs
  const force = req.query.force !== 'false';

  try {
    const summary = await refreshAllObservations({ force });
    const cacheStats = getCacheStats();

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
      cache: {
        entries: cacheStats.entries,
        fresh: cacheStats.fresh,
        stale: cacheStats.stale,
      },
    });
  } catch (err) {
    console.error('[OperatorOracleRefresh] Poll failed:', err);
    return res.status(500).json({
      error: 'Oracle refresh failed',
      message: (err as Error).message,
    });
  }
}
