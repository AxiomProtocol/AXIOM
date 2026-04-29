import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';

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
 * Internally proxies to /api/solvency/auto-ingest so all rate-limiting,
 * snapshot persistence, AME re-run, and audit trail behavior stays in
 * a single canonical place. Because auto-ingest itself requires
 * `ADMIN_SOLVENCY_KEY`, this endpoint hard-requires it regardless of
 * which caller secret is configured — otherwise the upstream call would
 * silently 401 and produce a misleading 502 to the scheduler.
 *
 * INTERNAL_API_BASE_URL is locked to loopback (localhost / 127.0.0.1) to
 * prevent SSRF / admin-key exfiltration via env misconfiguration.
 *
 * On Vercel, where each route is its own isolated serverless function and
 * nothing is listening on loopback, the handler instead uses the deployment's
 * auto-injected hostname (VERCEL_URL). That value is set by the platform
 * itself, not by user-configurable env, so the SSRF property — that the
 * upstream call cannot be redirected to an attacker-controlled host — is
 * preserved.
 */

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function isSafeInternalBase(raw: string): { ok: true; base: string } | { ok: false; reason: string } {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, reason: `Unsupported protocol: ${u.protocol}` };
    }
    if (!LOOPBACK_HOSTS.has(u.hostname)) {
      return { ok: false, reason: `INTERNAL_API_BASE_URL must point at loopback (localhost / 127.0.0.1); got "${u.hostname}"` };
    }
    return { ok: true, base: u.origin };
  } catch {
    return { ok: false, reason: 'INTERNAL_API_BASE_URL is not a valid URL' };
  }
}

function resolveInternalBase(): { ok: true; base: string } | { ok: false; reason: string } {
  // Vercel: same-deployment self-call via the platform-injected hostname.
  // VERCEL_URL is set by Vercel and not user-configurable for application
  // code, so SSRF cannot be introduced via env misconfiguration here.
  if (process.env.VERCEL === '1' && process.env.VERCEL_URL) {
    try {
      const host = process.env.VERCEL_URL;
      const u = new URL(host.startsWith('http') ? host : `https://${host}`);
      return { ok: true, base: u.origin };
    } catch {
      return { ok: false, reason: 'VERCEL_URL is not a valid hostname' };
    }
  }
  // Everywhere else (Replit dev, single-process deploys): loopback only.
  const rawBase = process.env.INTERNAL_API_BASE_URL || 'http://localhost:5000';
  return isSafeInternalBase(rawBase);
}

function safeEqualStr(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) {
    // Constant-time-ish: still run a compare against itself to avoid
    // length-based timing leak, then return false.
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
    // Required to authenticate the upstream call into auto-ingest.
    return res.status(503).json({
      ok: false,
      error: 'ADMIN_SOLVENCY_KEY is not configured (required to proxy into auto-ingest).',
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

  const baseCheck = resolveInternalBase();
  if (!baseCheck.ok) {
    return res.status(503).json({ ok: false, error: baseCheck.reason });
  }
  const internalBase = baseCheck.base;
  const start = Date.now();

  try {
    // Re-use auto-ingest so rate-limit (30s), persistence, AME, and notes are all centralized.
    const ingest = await fetch(`${internalBase}/api/solvency/auto-ingest`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-auto-ingest-key': adminKey,
      },
      body: JSON.stringify({
        notes: `Scheduled refresh — triggered by /api/cron/refresh-solvency at ${new Date().toISOString()}`,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    const elapsedMs = Date.now() - start;
    const body: any = await ingest.json().catch(() => ({}));

    if (ingest.status === 429) {
      // Rate-limited — last snapshot still recent enough; treat as a no-op success.
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: 'rate_limited_recent_snapshot',
        elapsedMs,
      });
    }
    if (!ingest.ok) {
      // Don't echo upstream body — it may include diagnostic detail intended
      // for the same admin trust boundary, but the safer default is silence.
      return res.status(502).json({
        ok: false,
        error: `auto-ingest returned ${ingest.status}`,
        elapsedMs,
      });
    }

    return res.status(200).json({
      ok: true,
      skipped: false,
      elapsedMs,
      snapshotId: body?.snapshotId,
      checksum: body?.checksum,
      createdAt: body?.createdAt,
      summary: body?.summary,
      ameRun: body?.ameRun,
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Cron refresh failed',
      elapsedMs: Date.now() - start,
    });
  }
}
