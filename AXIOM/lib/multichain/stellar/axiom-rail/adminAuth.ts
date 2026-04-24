/**
 * Axiom Rail — Admin Authentication Utility
 *
 * Guards admin-only endpoints (settlements, monitor, etc.) with a static
 * secret key check plus an in-process IP-based failure rate limiter.
 *
 * After 5 failed attempts from the same IP within a 15-minute window,
 * further requests are rejected with 403 until the window expires.
 *
 * The lockout primitives are exported so the Capital Infrastructure
 * per-role auth helper (`lib/capinfra/auth.ts`) can share the same
 * IP-based brute-force protection without duplicating the failure map.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface FailureEntry {
  count: number;
  resetAt: number;
}

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

const failureMap = new Map<string, FailureEntry>();

export function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

function cleanExpiredEntries(now: number): void {
  for (const [key, entry] of failureMap) {
    if (entry.resetAt < now) failureMap.delete(key);
  }
}

/**
 * Returns true when the IP is *not* currently locked out. When false,
 * the response has already been written (403 + Retry-After) and the
 * caller must return immediately.
 *
 * Hard lockout by design: a correct credential does NOT bypass the
 * block during the window. This prevents brute-force attacks from
 * succeeding on attempt 6+ even if the attacker eventually guesses the
 * key. Ops runbook: wait for the 15-minute window to expire or deploy
 * from a new egress IP.
 */
export function checkAdminAuthLockout(req: NextApiRequest, res: NextApiResponse): boolean {
  const ip = getClientIp(req);
  const now = Date.now();
  cleanExpiredEntries(now);
  const entry = failureMap.get(ip);
  if (entry && entry.count >= MAX_FAILURES) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    console.error(`[adminAuth] IP ${ip} blocked (${entry.count} failures). Retry in ${retryAfterSec}s.`);
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(403).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export function recordAdminAuthFailure(req: NextApiRequest): void {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = failureMap.get(ip);
  const current = entry ?? { count: 0, resetAt: now + WINDOW_MS };
  const updated = { count: current.count + 1, resetAt: current.resetAt };
  failureMap.set(ip, updated);
  console.error(`[adminAuth] Failed auth from IP ${ip} (attempt ${updated.count}/${MAX_FAILURES})`);
}

export function recordAdminAuthSuccess(req: NextApiRequest): void {
  failureMap.delete(getClientIp(req));
}

/**
 * Returns true when the request is authenticated as admin.
 * Sends the appropriate error response and returns false otherwise.
 */
export function requireAdminAuth(req: NextApiRequest, res: NextApiResponse): boolean {
  if (!checkAdminAuthLockout(req, res)) return false;

  const expectedKey = process.env.ADMIN_SOLVENCY_KEY;
  const providedKey = req.headers['x-admin-key'] as string | undefined;

  if (!expectedKey || providedKey !== expectedKey) {
    recordAdminAuthFailure(req);
    res.status(403).json({ error: 'Unauthorized' });
    return false;
  }

  recordAdminAuthSuccess(req);
  return true;
}
