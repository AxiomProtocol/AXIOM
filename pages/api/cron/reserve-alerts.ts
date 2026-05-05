/**
 * GET/POST /api/cron/reserve-alerts
 *
 * Scheduled reserve balance alert check. Polls:
 *   - Deployer ETH balance (alerts when < 0.1 ETH)
 *   - AXAU vault buffer capacity (alerts when DEPLETED)
 *
 * Alerts fan out to Resend email (RESERVE_ALERT_EMAIL) and/or Discord
 * webhook (RESERVE_ALERT_DISCORD_WEBHOOK). Deduplication is tracked in
 * the `reserve_alerts` PostgreSQL table — each condition fires at most
 * once per active episode (cleared when the condition resolves).
 *
 * Auth: secret required on every call — no bypass paths.
 *   CRON_SECRET (preferred) or ADMIN_SOLVENCY_KEY must be present and match
 *   one of: Authorization: Bearer <secret>, x-cron-secret: <secret>, or ?key=<secret>.
 *   When CRON_SECRET is set in Vercel env vars, Vercel's scheduler automatically
 *   sends Authorization: Bearer <CRON_SECRET> on every invocation.
 *
 * NOTE: x-vercel-cron bypass is intentionally omitted here. Unlike purely
 * read-only cron routes, this endpoint fans out outbound email and Discord
 * notifications. Accepting an unauthenticated spoofable header would allow
 * any public caller to trigger operational noise/spam.
 *
 * Schedule: every 10 minutes (see vercel.json crons block)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';

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

  const adminKey  = process.env.ADMIN_SOLVENCY_KEY;
  const cronSecret = process.env.CRON_SECRET;
  const expected  = cronSecret || adminKey;

  if (!expected) {
    return res.status(503).json({
      ok: false,
      error: 'ADMIN_SOLVENCY_KEY (or CRON_SECRET) is not configured.',
    });
  }

  const bearer    = (req.headers['authorization'] || '').toString().replace(/^Bearer\s+/i, '');
  const headerKey = (req.headers['x-cron-secret'] || '').toString();
  const queryKey  = (req.query.key as string) || '';
  const provided  = bearer || headerKey || queryKey;

  // No x-vercel-cron bypass — this endpoint sends outbound notifications and
  // must never be reachable by unauthenticated public callers.
  // Set CRON_SECRET in Vercel env vars; the scheduler sends it automatically.
  if (!provided || !safeEqualStr(provided, expected)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const start = Date.now();

  try {
    const { runReserveAlerts } = await import('../../../lib/reserves/reserveAlertRunner');
    const result = await runReserveAlerts();

    return res.status(200).json({
      ok: true,
      elapsedMs: Date.now() - start,
      ...result,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; stack?: string };
    console.error('[cron/reserve-alerts] error:', e?.message, e?.stack);
    return res.status(500).json({
      ok: false,
      error: e?.message ?? 'Reserve alert run failed',
      elapsedMs: Date.now() - start,
    });
  }
}
