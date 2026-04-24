import type { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

function getKey(req: NextApiRequest, prefix: string): string {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.socket.remoteAddress ??
    'unknown';
  return `${prefix}:${ip}`;
}

function check(
  req: NextApiRequest,
  res: NextApiResponse,
  prefix: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const key = getKey(req, prefix);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      error: 'Too many requests. Please wait before trying again.',
      retryAfterSeconds: retryAfter,
    });
    return false;
  }

  entry.count += 1;
  return true;
}

export function rateLimitStrict(req: NextApiRequest, res: NextApiResponse): boolean {
  return check(req, res, 'strict', 10, 60_000);
}

export function rateLimitDefault(req: NextApiRequest, res: NextApiResponse): boolean {
  return check(req, res, 'default', 60, 60_000);
}

export function rateLimitAuth(req: NextApiRequest, res: NextApiResponse): boolean {
  return check(req, res, 'auth', 5, 60_000);
}

export function rateLimitDistPay(req: NextApiRequest, res: NextApiResponse): boolean {
  return check(req, res, 'dist-pay', 1, 5_000);
}

/**
 * Rate limit by an arbitrary string key (NOT the request's IP).
 *
 * Useful when you want a second axis of protection beyond per-IP — e.g.
 * "no more than N attempts per reportId per minute" so a distributed
 * attacker can't probe one report from many IPs.
 *
 * Writes the 429 response itself when exhausted (same shape as the IP
 * limiters above) and returns false; returns true to indicate "proceed".
 */
export function rateLimitByKey(
  res: NextApiResponse,
  prefix: string,
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const fullKey = `${prefix}:${key}`;
  const now = Date.now();
  const entry = store.get(fullKey);

  if (!entry || now >= entry.resetAt) {
    store.set(fullKey, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      error: 'Too many requests. Please wait before trying again.',
      retryAfterSeconds: retryAfter,
    });
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Test-only escape hatch: clears every rate-limit bucket. Production
 * callers must never use this — it would let an attacker reset their
 * own quota. It exists because the per-IP and per-key buckets are
 * intentionally process-global, and tests need a clean slate per case
 * to avoid bleed-over between scenarios.
 */
export function __resetRateLimitStoreForTests(): void {
  store.clear();
}
