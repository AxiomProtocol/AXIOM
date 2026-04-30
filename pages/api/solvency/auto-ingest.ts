import type { NextApiRequest, NextApiResponse } from 'next';
import { runAutoIngest, RunAutoIngestError } from '../../../lib/solvency/runAutoIngest';

/**
 * Public auto-ingest endpoint.
 *
 * The actual snapshot generation lives in `lib/solvency/runAutoIngest.ts`
 * so the scheduled cron handler can invoke it directly without an HTTP
 * self-call (which is unreliable on Vercel's split-serverless model).
 *
 * Auth model preserved verbatim from the previous implementation:
 *   - Trusted-host check (request originated from same deployment), OR
 *   - Admin key via `x-auto-ingest-key` header / `?key=` query string.
 *
 * Auxiliary calls (oracle enrichment, AME re-run) are wired through the
 * request-derived host URL so the existing on-Replit behavior is
 * preserved end-to-end. On Vercel they will quietly fail-soft and the
 * snapshot still persists.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-cache');

  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  const providedKey = (req.headers['x-auto-ingest-key'] as string) || (req.query.key as string);
  const referer = (req.headers['referer'] || '') as string;
  const origin = (req.headers['origin'] || '') as string;
  const host = req.headers['host'] || '';
  const forwardedHost = req.headers['x-forwarded-host'] || '';
  const publicDomain = process.env.PUBLIC_DOMAIN || '';

  const trustedHosts = [host, forwardedHost, publicDomain, `www.${publicDomain}`].filter(Boolean);
  const requestSource = referer || origin;
  const isInternalCall = trustedHosts.some(h => requestSource.includes(h as string));
  const isAdminAuth = adminKey && providedKey && providedKey === adminKey;

  if (!isInternalCall && !isAdminAuth) {
    console.log('[auto-ingest] Auth failed:', { referer, origin, host, forwardedHost, publicDomain, trustedHosts });
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Derive an internal base URL for auxiliary calls (oracle, AME). On
  // Replit dev this is loopback; on hosted platforms we use the request's
  // own Host header (already validated by the trusted-host check above).
  const fwdHost = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || '';
  const reqHost = (Array.isArray(host) ? host[0] : host) || '';
  const auxHost = (fwdHost || reqHost).toString();
  let internalBaseUrl: string | null = null;
  if (auxHost) {
    try {
      const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$)/.test(auxHost);
      const proto = isLocal ? 'http' : 'https';
      internalBaseUrl = new URL(`${proto}://${auxHost}`).origin;
    } catch {
      internalBaseUrl = process.env.INTERNAL_API_BASE_URL || 'http://localhost:5000';
    }
  } else {
    internalBaseUrl = process.env.INTERNAL_API_BASE_URL || 'http://localhost:5000';
  }

  try {
    const result = await runAutoIngest({
      notes: req.body?.notes,
      internalBaseUrl,
      adminKey,
    });

    if (result.rateLimited) {
      return res.status(429).json({
        success: false,
        error: `Rate limited. Last snapshot was ${result.secondsSinceLast}s ago. Wait at least 30 seconds.`,
      });
    }

    return res.status(201).json({
      success: true,
      snapshotId: result.snapshotId,
      checksum: result.checksum,
      createdAt: result.createdAt,
      summary: result.summary,
      ameRun: result.ameRun,
    });
  } catch (err: any) {
    console.error('[solvency/auto-ingest] Error:', err);
    const status = err instanceof RunAutoIngestError ? err.status : 500;
    return res.status(status).json({ success: false, error: err.message || 'Auto-ingest failed' });
  }
}
