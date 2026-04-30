import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';
import { runAutoIngest, RunAutoIngestError } from '../../../lib/solvency/runAutoIngest';

/**
 * Scheduled solvency-snapshot refresher.
 *
 * Wire this to any external scheduler (Replit Scheduled Deployment,
 * cron-job.org, EasyCron, GitHub Actions cron) so the canonical snapshot
 * served by /api/solvency/latest cannot drift while no one happens to be
 * hitting auto-ingest manually.
 *
 * Auth (in priority order):
 *   1. `Authorization: Bearer <CRON_SECRET>`         — preferred for hosted cron
 *   2. `x-cron-secret: <CRON_SECRET>`                — alternative header
 *   3. `?key=<CRON_SECRET>`                          — query string (last resort)
 *
 * Caller secret = `CRON_SECRET` if set, else `ADMIN_SOLVENCY_KEY`.
 *
 * IMPLEMENTATION NOTE — Vercel-safe execution model
 * ─────────────────────────────────────────────────
 * Earlier versions of this handler proxied into `/api/solvency/auto-ingest`
 * over HTTP. That works on Replit (one long-running process, loopback
 * always reachable) but breaks on Vercel — every API route is its own
 * isolated serverless function, so an HTTP self-call has to traverse
 * the public edge, which on this deployment surfaced as the framework's
 * generic "A server error has occurred" 500 even though the upstream
 * function itself was fine.
 *
 * The fix is to skip the self-call entirely: both this endpoint and
 * `/api/solvency/auto-ingest` now call `runAutoIngest()` from
 * `lib/solvency/runAutoIngest.ts` directly, in-process. No cross-function
 * network hops, no Host-header derivation, no platform-specific URL
 * resolver. The optional auxiliary calls (oracle, AME re-run) are
 * skipped from the cron path because they are non-essential — the
 * snapshot itself contains all the material data, and AME re-runs on
 * every public dashboard load anyway.
 */

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

  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  if (!adminKey) {
    return res.status(503).json({
      ok: false,
      error: 'ADMIN_SOLVENCY_KEY is not configured.',
    });
  }

  const cronSecret = process.env.CRON_SECRET;
  const expected = cronSecret || adminKey;

  const bearer = (req.headers['authorization'] || '').toString().replace(/^Bearer\s+/i, '');
  const headerKey = (req.headers['x-cron-secret'] || '').toString();
  const queryKey = (req.query.key as string) || '';
  const provided = bearer || headerKey || queryKey;

  if (!provided || !safeEqualStr(provided, expected)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const start = Date.now();

  try {
    const result = await runAutoIngest({
      notes: `Scheduled refresh — triggered by /api/cron/refresh-solvency at ${new Date().toISOString()}`,
      // Skip auxiliary HTTP calls — see header comment.
      internalBaseUrl: null,
    });

    const elapsedMs = Date.now() - start;

    if (result.rateLimited) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: 'rate_limited_recent_snapshot',
        secondsSinceLast: result.secondsSinceLast,
        elapsedMs,
        via: 'in-process',
      });
    }

    return res.status(200).json({
      ok: true,
      skipped: false,
      elapsedMs,
      snapshotId: result.snapshotId,
      checksum: result.checksum,
      createdAt: result.createdAt,
      summary: result.summary,
      ameRun: result.ameRun,
      via: 'in-process',
    });
  } catch (err: any) {
    const status = err instanceof RunAutoIngestError ? err.status : 500;
    return res.status(status).json({
      ok: false,
      error: err?.message || 'Cron refresh failed',
      elapsedMs: Date.now() - start,
      via: 'in-process',
    });
  }
}
