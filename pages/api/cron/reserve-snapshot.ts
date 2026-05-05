/**
 * GET /api/cron/reserve-snapshot
 *
 * Hourly cron job that writes one balance row per reserve asset to
 * `reserve_balance_snapshots`. The data powers the 7-day trend sparklines
 * on the Reserves tab.
 *
 * Auth: Vercel's cron scheduler sends `x-vercel-cron: 1` on every invocation,
 * which is accepted here because this route has no outbound notification
 * side-effects (DB write only). External callers must supply a matching
 * CRON_SECRET or ADMIN_SOLVENCY_KEY.
 *
 * Schedule: every hour on the hour (see vercel.json crons block)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';
import { runReserveSnapshot } from '../../../lib/reserves/reserveSnapshotRunner';

function safeEqualStr(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

function isAuthorized(req: NextApiRequest): boolean {
  const cronSecret  = process.env.CRON_SECRET ?? '';
  const solvencyKey = process.env.ADMIN_SOLVENCY_KEY ?? '';
  const validSecrets = [cronSecret, solvencyKey].filter(Boolean);
  if (validSecrets.length === 0) return false;

  const bearer = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const header = (req.headers['x-cron-secret'] as string) ?? '';
  const query  = (req.query.key as string) ?? '';

  return validSecrets.some(
    secret =>
      (bearer && safeEqualStr(bearer, secret)) ||
      (header && safeEqualStr(header, secret)) ||
      (query  && safeEqualStr(query, secret)),
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const result = await runReserveSnapshot();
    return res.status(200).json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[reserve-snapshot cron] Fatal error:', message);
    return res.status(500).json({ ok: false, error: message });
  }
}
