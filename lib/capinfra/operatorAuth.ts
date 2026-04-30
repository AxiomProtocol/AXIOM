/**
 * Capital Infrastructure — Phase 3A.3 operator-UI cookie auth.
 *
 * Operator pages are gated by an httpOnly cookie set after a key
 * exchange against `ADMIN_SOLVENCY_KEY`. The cookie value IS the
 * admin key; pages and getServerSideProps validate via constant-time
 * compare. This is intentionally simple — operator UI is internal.
 */

import { timingSafeEqual } from 'node:crypto';
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next';

export const OPERATOR_COOKIE = 'cap_operator_key';
export const OPERATOR_HEADER_KEY = 'x-admin-key';

function constantTimeEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function getExpectedKey(): string | null {
  const raw = process.env.ADMIN_SOLVENCY_KEY ?? null;
  return raw ? raw.trim() : null;
}

export function isValidOperatorKey(provided: string | undefined | null): boolean {
  if (!provided) return false;
  const expected = getExpectedKey();
  if (!expected) return false;
  return constantTimeEquals(provided.trim(), expected);
}

export function readOperatorCookie(req: GetServerSidePropsContext['req'] | NextApiRequest): string | null {
  const cookies = (req as { cookies?: Record<string, string> }).cookies;
  if (!cookies) return null;
  return cookies[OPERATOR_COOKIE] ?? null;
}

export function setOperatorCookie(res: NextApiResponse, key: string): void {
  // 8 hour session
  const maxAge = 60 * 60 * 8;
  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader(
    'Set-Cookie',
    `${OPERATOR_COOKIE}=${encodeURIComponent(key)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${isProd ? '; Secure' : ''}`,
  );
}

export function clearOperatorCookie(res: NextApiResponse): void {
  res.setHeader(
    'Set-Cookie',
    `${OPERATOR_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
  );
}

/**
 * Helper for getServerSideProps — returns a redirect to /operator/login
 * if the cookie is missing or invalid. Returns null when authorized so
 * the caller can proceed.
 */
export function requireOperatorCookie(ctx: GetServerSidePropsContext) {
  const provided = readOperatorCookie(ctx.req);
  if (!isValidOperatorKey(provided)) {
    return {
      redirect: {
        destination: `/operator/login?next=${encodeURIComponent(ctx.resolvedUrl)}`,
        permanent: false,
      },
    } as const;
  }
  return null;
}

export function getOperatorAdminKey(): string {
  const k = getExpectedKey();
  if (!k) throw new Error('ADMIN_SOLVENCY_KEY not configured');
  return k;
}
