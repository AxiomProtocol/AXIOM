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
 * Throttle (Task #302 / #328): Once an actor (or their IP) has successfully
 * triggered a real fan-out, further calls are short-circuited with
 * 429 + `retry_after_seconds` for `TEST_PAGE_COOLDOWN_MS` (default
 * 60s). This protects the on-call inbox from being flooded by a
 * bored finger on the dashboard button or a runaway operator script,
 * without removing the on-demand wiring check. Calls that authenticated
 * but produced no real page (skipped — no channels configured) do NOT
 * arm the cooldown so the operator can keep iterating on env wiring.
 *
 * The cooldown is backed by the shared Postgres audit table
 * (`cap_audit_events`). This means it survives process restarts and
 * applies uniformly across every Next.js replica — there is no
 * instance-local state to bypass by hitting a different server or
 * triggering a deploy.
 *
 * Reliability guarantees:
 *   - If the cooldown DB read fails, the endpoint returns 503 (fail-closed)
 *     rather than accidentally allowing a send that should be rate-limited.
 *   - For non-skipped sends the audit row is written with a strict (throwing)
 *     writer so the cooldown record is always created or the request fails
 *     with 500. This prevents a silent audit-write failure from leaving the
 *     cooldown unarmed after a real page was sent.
 *   - Skipped sends still use the soft (best-effort) audit writer because no
 *     cooldown record is needed and losing an informational audit row must
 *     not stop the operator from iterating on env wiring.
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
 * Response (503): `{ error: 'COOLDOWN_CHECK_UNAVAILABLE', message }`
 *   Returned when the cooldown DB read fails. Fail-closed: we cannot
 *   confirm the cooldown status, so we refuse the request rather than
 *   risk flooding on-call.
 *
 * Audit trail: every successful POST also writes a single
 * `risk.integrity.test_page_sent` audit event capturing the resolved
 * actor, correlationId, client IP, channelsPaged and channel error
 * strings — so on-call drills are searchable in the cap-infra audit
 * search UI even when the synthetic email/Discord message is silently
 * lost in transit. For non-skipped sends the write is strict (failure
 * means 500); for skipped sends it is best-effort.
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
import {
  emitAuditEvent,
  emitAuditEventStrict,
  getLatestTestPageEvent,
} from '../../../../../lib/capinfra/audit';
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

interface CooldownCheck {
  ok: boolean;
  retryAfterSec: number;
}

/**
 * Checks the shared Postgres audit table for a recent
 * `risk.integrity.test_page_sent` event matching this actor or IP.
 * Returns `{ ok: false, retryAfterSec }` while the cooldown is active,
 * `{ ok: true, retryAfterSec: 0 }` otherwise.
 *
 * Deliberately lets DB errors propagate to the caller so it can
 * respond fail-closed (503) rather than silently allowing a send that
 * should be rate-limited.
 */
async function checkCooldown(actor: string, ip: string, nowMs: number): Promise<CooldownCheck> {
  // Throws intentionally on DB error — caller must handle.
  const event = await getLatestTestPageEvent(actor, ip, TEST_PAGE_COOLDOWN_MS);
  if (!event) return { ok: true, retryAfterSec: 0 };
  const expiresAt = event.createdAt.getTime() + TEST_PAGE_COOLDOWN_MS;
  const remainingMs = expiresAt - nowMs;
  if (remainingMs <= 0) return { ok: true, retryAfterSec: 0 };
  // Round up so a partial second still produces a >=1 retry hint;
  // a 200ms remaining window should still tell the client "1s".
  return { ok: false, retryAfterSec: Math.max(1, Math.ceil(remainingMs / 1000)) };
}

/**
 * No-op kept for backward compatibility with the test suite. The
 * cooldown is now backed by the Postgres audit table (via
 * `getLatestTestPageEvent`), so tests mock that function directly
 * rather than clearing an in-process map.
 */
export function _resetTestPageCooldownsForTests(): void {
  // no-op — cooldown state lives in the database, not in process memory.
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

  // Fail-closed: if the cooldown DB read fails we cannot confirm the
  // rate-limit state, so refuse the request with 503 rather than
  // accidentally allowing a send that should be blocked.
  let cd: CooldownCheck;
  try {
    cd = await checkCooldown(actor, ip, nowMs);
  } catch (err) {
    console.error(
      '[capinfra.risk.integrity.test-page] cooldown check failed',
      err,
    );
    return res.status(503).json({
      error: 'COOLDOWN_CHECK_UNAVAILABLE',
      message:
        'Unable to verify rate-limit status. The test page was not sent. Please try again in a moment.',
    });
  }

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

    const auditPayload = {
      eventType: TEST_PAGE_AUDIT_EVENT_TYPE,
      aggregateType: 'asset',
      aggregateId: SYNTHETIC_TEST_PAGE_ASSET_ID,
      assetId: SYNTHETIC_TEST_PAGE_ASSET_ID,
      actor,
      correlationId: payload.correlationId,
      payloadJson: {
        kind: SYNTHETIC_TEST_PAGE_KIND,
        testPage: true,
        ip,
        channelsPaged: result.channelsPaged,
        errors: result.errors,
        skipped: result.skipped,
      },
    };

    if (!result.skipped) {
      // Strong-guarantee write for non-skipped sends: the audit row IS
      // the cooldown record. If this insert fails the throw is caught
      // below and returned as 500. Returning 200 without the row would
      // leave the cooldown unarmed after a real page was dispatched,
      // which is the reliability regression the reviewer flagged.
      await emitAuditEventStrict(auditPayload);
    } else {
      // Skipped sends: soft-guarantee write so an informational audit row
      // that carries no cooldown weight never aborts the operator's
      // env-wiring iteration loop.
      await emitAuditEvent(auditPayload);
    }

    return res.status(200).json({ result });
  } catch (err) {
    // Defense-in-depth: the pager already swallows channel errors, but
    // never let an unexpected throw (including a failed strict audit
    // write for a non-skipped send) leak as a 500 without context.
    console.error(
      '[capinfra.risk.integrity.test-page] unexpected throw',
      err,
    );
    return res.status(500).json({
      error: 'INTERNAL',
      message: err instanceof Error ? err.message : 'unexpected error',
    });
  }
}
