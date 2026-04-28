#!/usr/bin/env tsx
/**
 * Scheduled solvency-snapshot refresher.
 *
 * Designed to be invoked by a Replit Scheduled Deployment (or any external
 * cron service) on a schedule (recommended: hourly). It hits the running
 * web app's /api/cron/refresh-solvency endpoint with the cron secret, which
 * in turn proxies to /api/solvency/auto-ingest so all rate-limit, persistence,
 * and AME re-run behavior stays in one canonical place.
 *
 * URL resolution (in priority order):
 *   1. SOLVENCY_REFRESH_URL env var (full URL incl. scheme)
 *   2. REPLIT_DOMAINS (auto-set in deployed Repls — first domain, https://)
 *   3. http://localhost:5000  (local dev fallback)
 *
 * Auth secret:
 *   1. CRON_SECRET if set
 *   2. ADMIN_SOLVENCY_KEY otherwise (mirrors the endpoint's fallback)
 *
 * Exit codes:
 *   0  — snapshot refreshed (or rate-limited; treated as no-op success)
 *   1  — config error (missing secret, no URL resolvable)
 *   2  — endpoint reachable but returned non-2xx (logged for cron alerting)
 */

function resolveBaseUrl(): string {
  const explicit = process.env.SOLVENCY_REFRESH_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const replitDomains = process.env.REPLIT_DOMAINS;
  if (replitDomains) {
    const first = replitDomains.split(',')[0].trim();
    if (first) return `https://${first}`;
  }

  return 'http://localhost:5000';
}

async function main(): Promise<number> {
  const cronSecret = process.env.CRON_SECRET;
  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  const secret = cronSecret || adminKey;
  if (!secret) {
    console.error('[refresh-solvency] FATAL: neither CRON_SECRET nor ADMIN_SOLVENCY_KEY is set');
    return 1;
  }

  const baseUrl = resolveBaseUrl();
  const url = `${baseUrl}/api/cron/refresh-solvency`;
  const startedAt = new Date().toISOString();
  console.log(`[refresh-solvency] ${startedAt} — calling ${url}`);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err: any) {
    console.error(`[refresh-solvency] FETCH FAILED: ${err?.message || err}`);
    return 2;
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    console.error(`[refresh-solvency] HTTP ${res.status} — ${JSON.stringify(body)}`);
    return 2;
  }

  if (body?.skipped) {
    console.log(`[refresh-solvency] SKIPPED (rate-limited; existing snapshot still recent). elapsed=${body?.elapsedMs}ms`);
    return 0;
  }

  console.log(
    `[refresh-solvency] OK snapshotId=${body?.snapshotId} checksum=${body?.checksum} ` +
      `treasury=${body?.summary?.treasuryTotalUsd} reserves=${body?.summary?.psmReserves} ` +
      `liabilities=${body?.summary?.liabilities} ame=${body?.ameRun} elapsed=${body?.elapsedMs}ms`,
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`[refresh-solvency] UNCAUGHT: ${err?.stack || err}`);
    process.exit(2);
  });
