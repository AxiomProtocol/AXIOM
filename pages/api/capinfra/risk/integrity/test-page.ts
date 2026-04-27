/**
 * POST /api/capinfra/risk/integrity/test-page
 *
 * Lets on-call verify the integrity pager wiring (email + Discord) is
 * actually healthy before a real `collateral.integrity_failed` event
 * fires. The endpoint builds a clearly-labelled synthetic payload
 * (`testPage: true`) and calls `pageOnCallForIntegrityFailure`, which
 * fans the event out to whatever channels are configured via
 * `INTEGRITY_ALERT_EMAIL` / `INTEGRITY_ALERT_DISCORD_WEBHOOK`.
 *
 * Auth — hybrid, by design:
 *   1. Server-to-server / role-based: `x-admin-key` header bound to
 *      RISK_OPERATOR (or SUPER_ADMIN) via `requireOperator`.
 *   2. Operator console (browser, httpOnly cookie): the `cap_operator_key`
 *      cookie set by the operator login flow. The cookie holds
 *      `ADMIN_SOLVENCY_KEY`, which is treated as SUPER_ADMIN by the
 *      role index, so an operator already authenticated to the console
 *      can press the "Send test page" button without exposing the
 *      admin key on the client.
 *
 * Throttle (Task #302): Once an actor (or their IP) has successfully
 * triggered a real fan-out, further calls are short-circuited with
 * 429 + `retry_after_seconds` for `TEST_PAGE_COOLDOWN_MS` (default
 * 60s). This protects the on-call inbox from being flooded by a
 * bored finger on the dashboard button or a runaway operator script,
 * without removing the on-demand wiring check. Calls that authenticated
 * but produced no real page (skipped — no channels configured) do NOT
 * arm the cooldown so the operator can keep iterating on env wiring.
 *
 * Response (200): `{ result: { channelsPaged, errors, skipped } }`
 *   The pager never throws — channel failures come back inside the
 *   result envelope so the operator console can show "email OK,
 *   Discord failed" rather than a flat 500.
 *
 * Response (429): `{ error: 'TEST_PAGE_RATE_LIMITED', retry_after_seconds, message }`
 *   Also sets the `Retry-After` header (in whole seconds) so generic
 *   HTTP clients honour the cooldown without parsing the JSON body.
 *
 * Audit trail: every successful POST also writes a single
 * `risk.integrity.test_page_sent` audit event (best-effort) capturing
 * the resolved actor, correlationId, channelsPaged and channel error
 * strings — so on-call drills are searchable in the cap-infra audit
 * search UI even when the synthetic email/Discord message is silently
 * lost in transit.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  CAP_INFRA_ROLES,
  getActor,
  requireOperator,
} from '../../../../../lib/capinfra/auth';
import {
  isValidOperatorKey,
  readOperatorCookie,
} from '../../../../../lib/capinfra/operatorAuth';
import { pageOnCallForIntegrityFailure } from '../../../../../lib/capinfra/notifications/integrityPager';
import { emitAuditEvent } from '../../../../../lib/capinfra/audit';
import { getClientIp } from '../../../../../lib/multichain/stellar/axiom-rail/adminAuth';

export const SYNTHETIC_TEST_PAGE_ASSET_ID = 'TEST-PAGE-SYNTHETIC';
export const SYNTHETIC_TEST_PAGE_SYMBOL = 'TEST-PAGE';
export const SYNTHETIC_TEST_PAGE_KIND = 'test_page';
export const TEST_PAGE_AUDIT_EVENT_TYPE = 'risk.integrity.test_page_sent';

/**
 * Per-actor / per-IP cooldown window between successful test pages.
 * 60s is enough to discourage a bored finger from fanning dozens of
 * synthetic pages out before the on-call has even acked the first one,
 * while still letting a legitimate operator re-run the wiring check a
 * minute later if a channel needs a second confirmation.
 */
export const TEST_PAGE_COOLDOWN_MS = 60_000;
export const TEST_PAGE_RATE_LIMITED_ERROR = 'TEST_PAGE_RATE_LIMITED';

const cooldownMap = new Map<string, number>();

function buildCooldownKeys(actor: string, ip: string): string[] {
  // Both axes block independently: a single operator on two IPs and
  // two operators on one shared IP are both rate-limited the same way.
  return [`actor:${actor}`, `ip:${ip}`];
}

interface CooldownCheck {
  ok: boolean;
  retryAfterSec: number;
}

function checkCooldown(actor: string, ip: string, nowMs: number): CooldownCheck {
  let maxRemainingMs = 0;
  for (const key of buildCooldownKeys(actor, ip)) {
    const expiresAt = cooldownMap.get(key);
    if (expiresAt === undefined) continue;
    if (expiresAt <= nowMs) {
      cooldownMap.delete(key);
      continue;
    }
    const remaining = expiresAt - nowMs;
    if (remaining > maxRemainingMs) maxRemainingMs = remaining;
  }
  if (maxRemainingMs > 0) {
    // Round up so a partial second still produces a >=1 retry hint;
    // a 200ms remaining window should still tell the client "1s".
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(maxRemainingMs / 1000)) };
  }
  return { ok: true, retryAfterSec: 0 };
}

function armCooldown(actor: string, ip: string, nowMs: number): void {
  const expiresAt = nowMs + TEST_PAGE_COOLDOWN_MS;
  for (const key of buildCooldownKeys(actor, ip)) {
    cooldownMap.set(key, expiresAt);
  }
}

/**
 * Test-only hook so the cooldown map can be cleared between cases
 * without re-importing the handler module. Not exported on a public
 * path; lives on the handler module itself so the test file can call
 * it after each `it()`.
 */
export function _resetTestPageCooldownsForTests(): void {
  cooldownMap.clear();
}

function buildSyntheticPayload(actor: string) {
  const ts = new Date().toISOString();
  return {
    assetId: SYNTHETIC_TEST_PAGE_ASSET_ID,
    symbol: SYNTHETIC_TEST_PAGE_SYMBOL,
    assetType: null,
    kind: SYNTHETIC_TEST_PAGE_KIND,
    detail:
      'Synthetic on-call wiring verification. No real asset was frozen; if you received this, the integrity pager channel is healthy.',
    rationale: `[${ts}] TEST PAGE — synthetic on-call wiring verification triggered by ${actor}. No real asset is affected.`.slice(
      0,
      2000,
    ),
    previousClass: 'GREEN' as const,
    actor,
    correlationId: `test_page_${ts}`,
    testPage: true,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  // Hybrid auth: prefer the cookie path so the operator console can
  // call this without surfacing the admin key on the client. Only fall
  // through to the role-gated header check if no cookie was sent.
  const cookieKey = readOperatorCookie(req);
  let actor: string;
  if (cookieKey !== null && isValidOperatorKey(cookieKey)) {
    const headerOperator = req.headers['x-operator'];
    const operator =
      typeof headerOperator === 'string' && headerOperator.length > 0
        ? headerOperator.slice(0, 80)
        : 'operator_console';
    actor = `${operator}@${CAP_INFRA_ROLES.SUPER_ADMIN}`;
  } else {
    if (!requireOperator(req, res, CAP_INFRA_ROLES.RISK_OPERATOR)) return;
    actor = getActor(req);
  }

  // Throttle AFTER auth so the cooldown is keyed on a real actor; an
  // unauthenticated probe never even reaches this branch.
  const nowMs = Date.now();
  const ip = getClientIp(req);
  const cd = checkCooldown(actor, ip, nowMs);
  if (!cd.ok) {
    res.setHeader('Retry-After', String(cd.retryAfterSec));
    return res.status(429).json({
      error: TEST_PAGE_RATE_LIMITED_ERROR,
      retry_after_seconds: cd.retryAfterSec,
      message: `Test page is rate-limited to one per ${Math.ceil(
        TEST_PAGE_COOLDOWN_MS / 1000,
      )}s per operator/IP to protect the on-call inbox from being flooded. Try again in ${cd.retryAfterSec}s.`,
    });
  }

  const payload = buildSyntheticPayload(actor);
  try {
    const result = await pageOnCallForIntegrityFailure(payload);
    // Only arm the cooldown when a real fan-out attempt happened.
    // `skipped: true` means no channels are configured, so the call
    // didn't actually wake on-call — the operator should be free to
    // keep tweaking env vars without waiting 60s between retries.
    if (!result.skipped) {
      armCooldown(actor, ip, nowMs);
    }
    // Best-effort audit row so on-call drills are searchable. The pager
    // has already fanned the synthetic message out — losing one audit
    // row must not make the operator console think the page failed, so
    // we use the soft-guarantee writer (logs and swallows). Operators
    // can find these rows in the cap-infra audit search by filtering
    // on Event Type = `risk.integrity.test_page_sent`.
    await emitAuditEvent({
      eventType: TEST_PAGE_AUDIT_EVENT_TYPE,
      aggregateType: 'asset',
      aggregateId: SYNTHETIC_TEST_PAGE_ASSET_ID,
      assetId: SYNTHETIC_TEST_PAGE_ASSET_ID,
      actor,
      correlationId: payload.correlationId,
      payloadJson: {
        kind: SYNTHETIC_TEST_PAGE_KIND,
        testPage: true,
        channelsPaged: result.channelsPaged,
        errors: result.errors,
        skipped: result.skipped,
      },
    });
    return res.status(200).json({ result });
  } catch (err) {
    // Defense-in-depth: the pager already swallows channel errors, but
    // never let an unexpected throw leak as a 500 without context.
    console.error(
      '[capinfra.risk.integrity.test-page] unexpected pager throw',
      err,
    );
    return res.status(500).json({
      error: 'INTERNAL',
      message: err instanceof Error ? err.message : 'pager threw',
    });
  }
}
