/**
 * Axiom Rail — Admin Authentication Utility
 *
 * Guards admin-only endpoints (settlements, monitor, etc.) with a static
 * secret key check plus an in-process IP-based failure rate limiter.
 *
 * After 5 failed attempts from the same IP within a 15-minute window,
 * further requests are rejected with 429 until the window expires.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface FailureEntry {
  count: number;
  resetAt: number;
}

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

const failureMap = new Map<string, FailureEntry>();

function getClientIp(req: NextApiRequest): string {
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
 * Returns true when the request is authenticated as admin.
 * Sends the appropriate error response and returns false otherwise.
 */
export function requireAdminAuth(req: NextApiRequest, res: NextApiResponse): boolean {
  const expectedKey = process.env.ADMIN_SOLVENCY_KEY;
  const providedKey = req.headers['x-admin-key'] as string | undefined;
  const ip = getClientIp(req);
  const now = Date.now();

  cleanExpiredEntries(now);

  const entry = failureMap.get(ip);

  if (entry && entry.count >= MAX_FAILURES) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    console.error(`[adminAuth] IP ${ip} rate-limited (${entry.count} failures). Retry in ${retryAfterSec}s.`);
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({ error: 'Too many failed authentication attempts. Try again later.' });
    return false;
  }

  if (!expectedKey || providedKey !== expectedKey) {
    const current = entry ?? { count: 0, resetAt: now + WINDOW_MS };
    const updated = { count: current.count + 1, resetAt: current.resetAt };
    failureMap.set(ip, updated);
    console.error(`[adminAuth] Failed auth from IP ${ip} (attempt ${updated.count}/${MAX_FAILURES})`);
    res.status(403).json({ error: 'Unauthorized' });
    return false;
  }

  failureMap.delete(ip);
  return true;
}
