/**
 * Axiom Rail — Per-Endpoint Rate Limiter
 *
 * Simple in-process IP-based rate limiter. Each endpoint key
 * (e.g. 'sep24/submit', 'sep31/transactions') is tracked independently.
 *
 * Default: 10 requests per IP per minute before HTTP 429.
 * Entries expire automatically after the window passes.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

type EndpointKey = string;
type ClientIp = string;

const store = new Map<`${EndpointKey}:${ClientIp}`, RateLimitEntry>();

const DEFAULT_MAX = 10;
const DEFAULT_WINDOW_MS = 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000).unref();

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

/**
 * Returns true if the request is within the rate limit.
 * Sends HTTP 429 and returns false when the limit is exceeded.
 */
export function checkRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  endpointKey: string,
  options: { max?: number; windowMs?: number } = {},
): boolean {
  const max = options.max ?? DEFAULT_MAX;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const ip = getClientIp(req);
  const mapKey = `${endpointKey}:${ip}` as `${string}:${string}`;
  const now = Date.now();

  const entry = store.get(mapKey);
  if (!entry || entry.resetAt < now) {
    store.set(mapKey, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({ error: 'Rate limit exceeded. Please slow down.' });
    return false;
  }

  entry.count++;
  return true;
}
