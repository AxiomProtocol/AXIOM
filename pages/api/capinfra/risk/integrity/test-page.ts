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
 * Response (200): `{ result: { channelsPaged, errors, skipped } }`
 *   The pager never throws — channel failures come back inside the
 *   result envelope so the operator console can show "email OK,
 *   Discord failed" rather than a flat 500.
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

export const SYNTHETIC_TEST_PAGE_ASSET_ID = 'TEST-PAGE-SYNTHETIC';
export const SYNTHETIC_TEST_PAGE_SYMBOL = 'TEST-PAGE';
export const SYNTHETIC_TEST_PAGE_KIND = 'test_page';
export const TEST_PAGE_AUDIT_EVENT_TYPE = 'risk.integrity.test_page_sent';

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

  const payload = buildSyntheticPayload(actor);
  try {
    const result = await pageOnCallForIntegrityFailure(payload);
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
