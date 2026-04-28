/**
 * tests/integrity-test-page-endpoint.test.ts
 *
 * Tests for POST /api/capinfra/risk/integrity/test-page — the
 * RISK_OPERATOR-gated endpoint that lets on-call verify the
 * integrity pager wiring without waiting for a real auto-freeze.
 *
 * Coverage:
 *   1. Cookie auth path (operator-console "Send test page" button):
 *      - Valid operator cookie → 200, pager invoked once with a
 *        synthetic payload that has `testPage: true`.
 *      - Result envelope is forwarded to the client.
 *   2. Header auth path (server-to-server / per-role key):
 *      - x-admin-key bound to RISK_OPERATOR → 200, pager invoked.
 *      - x-admin-key bound to a non-RISK role → 403 ROLE_INSUFFICIENT,
 *        pager NOT invoked.
 *      - No cookie + no header → 403 Unauthorized, pager NOT invoked.
 *   3. Method gating:
 *      - Non-POST → 405 METHOD_NOT_ALLOWED with `Allow: POST`,
 *        pager NOT invoked.
 *   4. Synthetic payload shape:
 *      - testPage flag, dedicated symbol/assetId/kind, GREEN
 *        previousClass, actor stamp present.
 *   5. Audit trail:
 *      - Non-skipped sends use the strict-guarantee writer so the
 *        cooldown record is always created or the request fails 500.
 *      - Skipped sends use the soft-guarantee writer.
 *   6. Cooldown / rate-limiting (task #302 + #328):
 *      - DB-backed cooldown persists across process restarts and
 *        applies across replicas.
 *      - Fail-closed: 503 when the cooldown DB read fails.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mockPager = vi.fn();
const mockEmitAuditEvent = vi.fn();
const mockEmitAuditEventStrict = vi.fn();
const mockGetLatestTestPageEvent = vi.fn();

vi.mock('../lib/capinfra/notifications/integrityPager', () => ({
  pageOnCallForIntegrityFailure: (...args: unknown[]) => mockPager(...args),
}));

vi.mock('../lib/capinfra/audit', () => ({
  emitAuditEvent: (...args: unknown[]) => mockEmitAuditEvent(...args),
  emitAuditEventStrict: (...args: unknown[]) => mockEmitAuditEventStrict(...args),
  getLatestTestPageEvent: (...args: unknown[]) => mockGetLatestTestPageEvent(...args),
}));

const {
  default: testPageHandler,
  SYNTHETIC_TEST_PAGE_ASSET_ID,
  SYNTHETIC_TEST_PAGE_KIND,
  TEST_PAGE_AUDIT_EVENT_TYPE,
  TEST_PAGE_COOLDOWN_MS,
  TEST_PAGE_RATE_LIMITED_ERROR,
  _resetTestPageCooldownsForTests,
} = await import('../pages/api/capinfra/risk/integrity/test-page');

interface MockReqOptions {
  method?: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
  socket?: { remoteAddress?: string };
}

function makeReq(opts: MockReqOptions = {}): NextApiRequest {
  const { method = 'POST', cookies = {}, headers = {}, socket } = opts;
  return {
    method,
    headers,
    cookies,
    query: {},
    socket: socket ?? { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest;
}

interface MockRes {
  res: NextApiResponse;
  statusCode(): number;
  body(): unknown;
  headers(): Record<string, string>;
}

function makeRes(): MockRes {
  let _statusCode = 200;
  let _body: unknown = null;
  const _headers: Record<string, string> = {};
  const res = {
    status(code: number) {
      _statusCode = code;
      return res;
    },
    json(data: unknown) {
      _body = data;
      return res;
    },
    setHeader(name: string, value: string) {
      _headers[name.toLowerCase()] = value;
      return res;
    },
  } as unknown as NextApiResponse;
  return {
    res,
    statusCode: () => _statusCode,
    body: () => _body,
    headers: () => _headers,
  };
}

describe('POST /api/capinfra/risk/integrity/test-page', () => {
  const OPERATOR_KEY = 'test-admin-solvency-key';
  const RISK_KEY = 'test-risk-operator-key';
  const TREASURY_KEY = 'test-treasury-operator-key';
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    _resetTestPageCooldownsForTests();
    process.env = {
      ...savedEnv,
      ADMIN_SOLVENCY_KEY: OPERATOR_KEY,
      CAPINFRA_KEY_RISK_OPERATOR: RISK_KEY,
      CAPINFRA_KEY_TREASURY_OPERATOR: TREASURY_KEY,
    };
    mockPager.mockResolvedValue({
      channelsPaged: ['email'],
      errors: [],
      skipped: false,
    });
    // Non-skipped sends use the strict writer; skipped sends use the soft writer.
    mockEmitAuditEventStrict.mockResolvedValue('ae_strict_test');
    mockEmitAuditEvent.mockResolvedValue('ae_test');
    // Default: no blocking cooldown event in the DB.
    mockGetLatestTestPageEvent.mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = savedEnv;
    _resetTestPageCooldownsForTests();
    vi.useRealTimers();
  });

  it('accepts the operator cookie and returns the pager result envelope', async () => {
    const { res, statusCode, body } = makeRes();
    await testPageHandler(
      makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
      res,
    );

    expect(statusCode()).toBe(200);
    expect(body()).toEqual({
      result: { channelsPaged: ['email'], errors: [], skipped: false },
    });
    expect(mockPager).toHaveBeenCalledTimes(1);
  });

  it('builds a synthetic payload with the testPage marker', async () => {
    const { res } = makeRes();
    await testPageHandler(
      makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
      res,
    );

    const payload = mockPager.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.testPage).toBe(true);
    expect(payload.assetId).toBe(SYNTHETIC_TEST_PAGE_ASSET_ID);
    expect(payload.symbol).toBe('TEST-PAGE');
    expect(payload.kind).toBe('test_page');
    expect(payload.previousClass).toBe('GREEN');
    expect(typeof payload.actor).toBe('string');
    expect(String(payload.actor).length).toBeGreaterThan(0);
    expect(String(payload.rationale)).toMatch(/TEST PAGE/);
  });

  it('uses the x-operator header to label the actor on the cookie path', async () => {
    const { res } = makeRes();
    await testPageHandler(
      makeReq({
        cookies: { cap_operator_key: OPERATOR_KEY },
        headers: { 'x-operator': 'alice' },
      }),
      res,
    );

    const payload = mockPager.mock.calls[0][0] as { actor: string };
    expect(payload.actor).toContain('alice');
  });

  it('accepts an x-admin-key bound to RISK_OPERATOR', async () => {
    const { res, statusCode } = makeRes();
    await testPageHandler(
      makeReq({ headers: { 'x-admin-key': RISK_KEY } }),
      res,
    );

    expect(statusCode()).toBe(200);
    expect(mockPager).toHaveBeenCalledTimes(1);
  });

  it('rejects an x-admin-key bound to a non-risk role with 403 ROLE_INSUFFICIENT', async () => {
    const { res, statusCode, body } = makeRes();
    await testPageHandler(
      makeReq({ headers: { 'x-admin-key': TREASURY_KEY } }),
      res,
    );

    expect(statusCode()).toBe(403);
    expect(body()).toMatchObject({ error: 'ROLE_INSUFFICIENT' });
    expect(mockPager).not.toHaveBeenCalled();
  });

  it('rejects with 403 when neither cookie nor admin key is supplied', async () => {
    const { res, statusCode, body } = makeRes();
    await testPageHandler(makeReq(), res);

    expect(statusCode()).toBe(403);
    expect(body()).toMatchObject({ error: 'Unauthorized' });
    expect(mockPager).not.toHaveBeenCalled();
  });

  it('rejects with 403 when an unknown admin key is supplied', async () => {
    const { res, statusCode, body } = makeRes();
    await testPageHandler(
      makeReq({ headers: { 'x-admin-key': 'totally-unknown-key' } }),
      res,
    );

    expect(statusCode()).toBe(403);
    expect(body()).toMatchObject({ error: 'Unauthorized' });
    expect(mockPager).not.toHaveBeenCalled();
  });

  it('returns 405 with Allow: POST for non-POST methods', async () => {
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
      const { res, statusCode, body, headers } = makeRes();
      await testPageHandler(
        makeReq({
          method,
          cookies: { cap_operator_key: OPERATOR_KEY },
        }),
        res,
      );

      expect(statusCode()).toBe(405);
      expect(body()).toMatchObject({ error: 'METHOD_NOT_ALLOWED' });
      expect(headers().allow).toBe('POST');
      expect(mockPager).not.toHaveBeenCalled();
    }
  });

  it('forwards the pager skipped/error envelope verbatim (no channels configured)', async () => {
    mockPager.mockResolvedValueOnce({
      channelsPaged: [],
      errors: [],
      skipped: true,
    });
    const { res, statusCode, body } = makeRes();
    await testPageHandler(
      makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
      res,
    );
    expect(statusCode()).toBe(200);
    expect(body()).toEqual({
      result: { channelsPaged: [], errors: [], skipped: true },
    });
  });

  it('forwards the pager partial-failure envelope (Discord failed, email ok)', async () => {
    mockPager.mockResolvedValueOnce({
      channelsPaged: ['email'],
      errors: ['discord: HTTP 429'],
      skipped: false,
    });
    const { res, statusCode, body } = makeRes();
    await testPageHandler(
      makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
      res,
    );
    expect(statusCode()).toBe(200);
    expect(body()).toEqual({
      result: {
        channelsPaged: ['email'],
        errors: ['discord: HTTP 429'],
        skipped: false,
      },
    });
  });

  it('returns 500 with a contextful error if the pager throws unexpectedly', async () => {
    mockPager.mockRejectedValueOnce(new Error('boom'));
    const { res, statusCode, body } = makeRes();
    await testPageHandler(
      makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
      res,
    );
    expect(statusCode()).toBe(500);
    expect(body()).toMatchObject({ error: 'INTERNAL', message: 'boom' });
  });

  it('writes a single strict audit event with the resolved actor, channels paged, and errors', async () => {
    mockPager.mockResolvedValueOnce({
      channelsPaged: ['email', 'discord'],
      errors: [],
      skipped: false,
    });
    const { res, statusCode } = makeRes();
    await testPageHandler(
      makeReq({
        cookies: { cap_operator_key: OPERATOR_KEY },
        headers: { 'x-operator': 'alice' },
      }),
      res,
    );

    expect(statusCode()).toBe(200);
    // Non-skipped send → strict writer.
    expect(mockEmitAuditEventStrict).toHaveBeenCalledTimes(1);
    expect(mockEmitAuditEvent).not.toHaveBeenCalled();
    const audit = mockEmitAuditEventStrict.mock.calls[0][0] as Record<string, unknown>;
    expect(audit.eventType).toBe(TEST_PAGE_AUDIT_EVENT_TYPE);
    expect(audit.eventType).toBe('risk.integrity.test_page_sent');
    expect(audit.aggregateType).toBe('asset');
    expect(audit.aggregateId).toBe(SYNTHETIC_TEST_PAGE_ASSET_ID);
    expect(audit.assetId).toBe(SYNTHETIC_TEST_PAGE_ASSET_ID);
    expect(typeof audit.actor).toBe('string');
    expect(String(audit.actor)).toContain('alice');
    expect(typeof audit.correlationId).toBe('string');
    expect(String(audit.correlationId)).toMatch(/^test_page_/);

    const payloadJson = audit.payloadJson as Record<string, unknown>;
    expect(payloadJson.kind).toBe(SYNTHETIC_TEST_PAGE_KIND);
    expect(payloadJson.testPage).toBe(true);
    expect(payloadJson.channelsPaged).toEqual(['email', 'discord']);
    expect(payloadJson.errors).toEqual([]);
    expect(payloadJson.skipped).toBe(false);
  });

  it('records the client IP in the audit payload for cross-replica cooldown checks', async () => {
    const { res, statusCode } = makeRes();
    await testPageHandler(
      makeReq({
        cookies: { cap_operator_key: OPERATOR_KEY },
        socket: { remoteAddress: '203.0.113.42' },
      }),
      res,
    );

    expect(statusCode()).toBe(200);
    const audit = mockEmitAuditEventStrict.mock.calls[0][0] as Record<string, unknown>;
    const payloadJson = audit.payloadJson as Record<string, unknown>;
    expect(payloadJson.ip).toBe('203.0.113.42');
  });

  it('records channel error strings in the audit payload (partial-failure)', async () => {
    mockPager.mockResolvedValueOnce({
      channelsPaged: ['email'],
      errors: ['discord: HTTP 429'],
      skipped: false,
    });
    const { res, statusCode } = makeRes();
    await testPageHandler(
      makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
      res,
    );

    expect(statusCode()).toBe(200);
    // Partial failure is not skipped → strict writer.
    expect(mockEmitAuditEventStrict).toHaveBeenCalledTimes(1);
    const audit = mockEmitAuditEventStrict.mock.calls[0][0] as {
      payloadJson: { channelsPaged: string[]; errors: string[]; skipped: boolean };
    };
    expect(audit.payloadJson.channelsPaged).toEqual(['email']);
    expect(audit.payloadJson.errors).toEqual(['discord: HTTP 429']);
    expect(audit.payloadJson.skipped).toBe(false);
  });

  it('uses the soft-guarantee writer for skipped sends (no cooldown record needed)', async () => {
    mockPager.mockResolvedValueOnce({
      channelsPaged: [],
      errors: [],
      skipped: true,
    });
    const { res, statusCode } = makeRes();
    await testPageHandler(
      makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
      res,
    );

    expect(statusCode()).toBe(200);
    // Skipped → soft writer; strict writer must NOT have been called.
    expect(mockEmitAuditEvent).toHaveBeenCalledTimes(1);
    expect(mockEmitAuditEventStrict).not.toHaveBeenCalled();
    const audit = mockEmitAuditEvent.mock.calls[0][0] as {
      payloadJson: { channelsPaged: string[]; errors: string[]; skipped: boolean };
    };
    expect(audit.payloadJson.channelsPaged).toEqual([]);
    expect(audit.payloadJson.skipped).toBe(true);
  });

  it('stamps the header-auth admin actor on the audit event', async () => {
    const { res, statusCode } = makeRes();
    await testPageHandler(
      makeReq({ headers: { 'x-admin-key': RISK_KEY } }),
      res,
    );

    expect(statusCode()).toBe(200);
    expect(mockEmitAuditEventStrict).toHaveBeenCalledTimes(1);
    const audit = mockEmitAuditEventStrict.mock.calls[0][0] as { actor: string };
    expect(typeof audit.actor).toBe('string');
    expect(audit.actor.length).toBeGreaterThan(0);
  });

  it('reuses the synthetic correlation id so the audit row joins to the pager call', async () => {
    const { res } = makeRes();
    await testPageHandler(
      makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
      res,
    );

    const pagerPayload = mockPager.mock.calls[0][0] as { correlationId: string };
    const audit = mockEmitAuditEventStrict.mock.calls[0][0] as { correlationId: string };
    expect(audit.correlationId).toBe(pagerPayload.correlationId);
  });

  it('does not write an audit event when the pager throws unexpectedly', async () => {
    mockPager.mockRejectedValueOnce(new Error('boom'));
    const { res, statusCode } = makeRes();
    await testPageHandler(
      makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
      res,
    );

    expect(statusCode()).toBe(500);
    expect(mockEmitAuditEventStrict).not.toHaveBeenCalled();
    expect(mockEmitAuditEvent).not.toHaveBeenCalled();
  });

  it('does not write an audit event for non-POST methods', async () => {
    const { res, statusCode } = makeRes();
    await testPageHandler(
      makeReq({
        method: 'GET',
        cookies: { cap_operator_key: OPERATOR_KEY },
      }),
      res,
    );

    expect(statusCode()).toBe(405);
    expect(mockEmitAuditEventStrict).not.toHaveBeenCalled();
    expect(mockEmitAuditEvent).not.toHaveBeenCalled();
  });

  it('does not write an audit event when auth fails', async () => {
    const { res, statusCode } = makeRes();
    await testPageHandler(makeReq(), res);

    expect(statusCode()).toBe(403);
    expect(mockEmitAuditEventStrict).not.toHaveBeenCalled();
    expect(mockEmitAuditEvent).not.toHaveBeenCalled();
  });

  it('still returns 200 with the pager envelope if the audit write fails for skipped sends', async () => {
    // For skipped sends, emitAuditEvent (soft) is used — losing one informational
    // audit row must not abort the operator's env-wiring iteration loop.
    mockPager.mockResolvedValueOnce({
      channelsPaged: [],
      errors: [],
      skipped: true,
    });
    mockEmitAuditEvent.mockResolvedValueOnce(null); // simulates soft-swallowed failure
    const { res, statusCode, body } = makeRes();
    await testPageHandler(
      makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
      res,
    );

    expect(statusCode()).toBe(200);
    expect(body()).toEqual({
      result: { channelsPaged: [], errors: [], skipped: true },
    });
  });

  it('returns 500 if the strict cooldown-record write fails on a real send', async () => {
    // For non-skipped sends, emitAuditEventStrict throws on failure. That
    // throw propagates to the outer catch and becomes a 500 — a real page was
    // sent but no cooldown record was created, which is a data-integrity
    // problem the operator must know about rather than silently swallow.
    mockEmitAuditEventStrict.mockRejectedValueOnce(new Error('db down'));
    const { res, statusCode, body } = makeRes();
    await testPageHandler(
      makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
      res,
    );

    expect(statusCode()).toBe(500);
    expect(body()).toMatchObject({ error: 'INTERNAL', message: 'db down' });
  });

  describe('cooldown / rate-limiting (task #302 + #328)', () => {
    /**
     * Simulate the DB returning a cooldown row written `msSinceAgo` ms ago.
     * Defaults to 500 ms ago so there are still ~59.5 s left in the window.
     */
    function setBlockingCooldown(msSinceAgo = 500) {
      mockGetLatestTestPageEvent.mockResolvedValue({
        createdAt: new Date(Date.now() - msSinceAgo),
      });
    }

    it('rejects a second send within the cooldown window with 429 + retry_after_seconds', async () => {
      // First send — DB has no blocking event yet.
      const first = makeRes();
      await testPageHandler(
        makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
        first.res,
      );
      expect(first.statusCode()).toBe(200);
      expect(mockPager).toHaveBeenCalledTimes(1);

      // Simulate the DB now holding the event from the first send (500 ms ago).
      setBlockingCooldown(500);

      const second = makeRes();
      await testPageHandler(
        makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
        second.res,
      );

      expect(second.statusCode()).toBe(429);
      const body = second.body() as Record<string, unknown>;
      expect(body.error).toBe(TEST_PAGE_RATE_LIMITED_ERROR);
      expect(typeof body.retry_after_seconds).toBe('number');
      expect(body.retry_after_seconds).toBeGreaterThan(0);
      expect(body.retry_after_seconds).toBeLessThanOrEqual(
        Math.ceil(TEST_PAGE_COOLDOWN_MS / 1000),
      );
      expect(typeof body.message).toBe('string');
      // Retry-After header is set in whole seconds for generic clients.
      expect(second.headers()['retry-after']).toBeDefined();
      // Crucially, the throttled call must NOT actually fire the pager
      // a second time — that's the whole point of the cooldown.
      expect(mockPager).toHaveBeenCalledTimes(1);
      // Nor should it write a duplicate audit row.
      expect(mockEmitAuditEventStrict).toHaveBeenCalledTimes(1);
    });

    it('clears the cooldown for the same actor after the window expires', async () => {
      // The DB returns an event that is older than the cooldown window.
      // checkCooldown computes remainingMs <= 0 and lets the call through.
      mockGetLatestTestPageEvent.mockResolvedValue({
        createdAt: new Date(Date.now() - TEST_PAGE_COOLDOWN_MS - 1000),
      });

      const { res, statusCode } = makeRes();
      await testPageHandler(
        makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
        res,
      );
      expect(statusCode()).toBe(200);
      expect(mockPager).toHaveBeenCalledTimes(1);
    });

    it('throttles by IP even when a different actor (cookie vs header) hits the same address', async () => {
      const sameIp = { remoteAddress: '203.0.113.5' };
      const first = makeRes();
      await testPageHandler(
        makeReq({
          cookies: { cap_operator_key: OPERATOR_KEY },
          headers: { 'x-operator': 'alice' },
          socket: sameIp,
        }),
        first.res,
      );
      expect(first.statusCode()).toBe(200);

      // Simulate the DB returning a blocking event for the shared IP.
      setBlockingCooldown(500);

      // Different operator label but the same IP must still be blocked
      // by the per-IP axis of the cooldown.
      const second = makeRes();
      await testPageHandler(
        makeReq({
          cookies: { cap_operator_key: OPERATOR_KEY },
          headers: { 'x-operator': 'bob' },
          socket: sameIp,
        }),
        second.res,
      );
      expect(second.statusCode()).toBe(429);
      expect(mockPager).toHaveBeenCalledTimes(1);
    });

    it('throttles by actor even when the same operator script hits from a different IP', async () => {
      const first = makeRes();
      await testPageHandler(
        makeReq({
          headers: { 'x-admin-key': RISK_KEY },
          socket: { remoteAddress: '198.51.100.1' },
        }),
        first.res,
      );
      expect(first.statusCode()).toBe(200);

      // Simulate the DB returning a blocking event for the same actor.
      setBlockingCooldown(500);

      const second = makeRes();
      await testPageHandler(
        makeReq({
          headers: { 'x-admin-key': RISK_KEY },
          // Same actor (same key → same resolved actor stamp), different IP.
          socket: { remoteAddress: '198.51.100.99' },
        }),
        second.res,
      );
      expect(second.statusCode()).toBe(429);
      expect(mockPager).toHaveBeenCalledTimes(1);
    });

    it('does NOT arm the cooldown when the pager skipped (no channels configured)', async () => {
      // skipped=true means no channel was actually paged, so the
      // operator should be free to keep iterating on env wiring without
      // waiting 60s between attempts.
      // getLatestTestPageEvent filters out skipped rows in the DB query,
      // so the mock remains null → both calls return 200.
      mockPager.mockResolvedValue({
        channelsPaged: [],
        errors: [],
        skipped: true,
      });

      const first = makeRes();
      await testPageHandler(
        makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
        first.res,
      );
      expect(first.statusCode()).toBe(200);

      const second = makeRes();
      await testPageHandler(
        makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
        second.res,
      );
      expect(second.statusCode()).toBe(200);
      expect(mockPager).toHaveBeenCalledTimes(2);
    });

    it('does NOT arm the cooldown when the pager throws unexpectedly', async () => {
      // On a pager throw, emitAuditEventStrict is never called, so the DB has
      // no new row → getLatestTestPageEvent keeps returning null → second
      // call is allowed through.
      mockPager.mockRejectedValueOnce(new Error('boom'));
      const first = makeRes();
      await testPageHandler(
        makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
        first.res,
      );
      expect(first.statusCode()).toBe(500);

      // Pager is healthy on the retry — mock still returns null.
      const second = makeRes();
      await testPageHandler(
        makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
        second.res,
      );
      expect(second.statusCode()).toBe(200);
    });

    it('arms the cooldown on partial-failure envelopes (at least one channel was hit)', async () => {
      mockPager.mockResolvedValueOnce({
        channelsPaged: ['email'],
        errors: ['discord: HTTP 429'],
        skipped: false,
      });
      const first = makeRes();
      await testPageHandler(
        makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
        first.res,
      );
      expect(first.statusCode()).toBe(200);

      // Partial-failure is not skipped → the strict audit row arms the cooldown.
      setBlockingCooldown(500);

      const second = makeRes();
      await testPageHandler(
        makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
        second.res,
      );
      expect(second.statusCode()).toBe(429);
    });

    it('does NOT consume the cooldown on auth failures', async () => {
      // An unauthenticated probe must never even reach the throttle —
      // otherwise an attacker could DoS a real operator's button just
      // by hitting the endpoint anonymously.
      const probe = makeRes();
      await testPageHandler(makeReq(), probe.res);
      expect(probe.statusCode()).toBe(403);

      // DB still returns null — the unauthenticated probe did not arm anything.
      const real = makeRes();
      await testPageHandler(
        makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
        real.res,
      );
      expect(real.statusCode()).toBe(200);
    });

    it('returns 503 when the cooldown DB read fails (fail-closed)', async () => {
      // If getLatestTestPageEvent throws (transient DB error), the endpoint
      // must refuse the request with 503 rather than allowing a send that
      // might be rate-limited. Fail-closed is the correct posture here.
      mockGetLatestTestPageEvent.mockRejectedValueOnce(new Error('db timeout'));
      const { res, statusCode, body } = makeRes();
      await testPageHandler(
        makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
        res,
      );

      expect(statusCode()).toBe(503);
      const b = body() as Record<string, unknown>;
      expect(b.error).toBe('COOLDOWN_CHECK_UNAVAILABLE');
      expect(typeof b.message).toBe('string');
      // Pager must NOT have fired — request was refused.
      expect(mockPager).not.toHaveBeenCalled();
    });

    it('persists the cooldown across a simulated process restart (task #328)', async () => {
      // Establish that a successful page was sent on the first instance.
      const first = makeRes();
      await testPageHandler(
        makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
        first.res,
      );
      expect(first.statusCode()).toBe(200);

      // Simulate a process restart: the in-process state is gone.
      // _resetTestPageCooldownsForTests() is a no-op with the DB-backed
      // implementation; the cooldown is held in Postgres. We model the
      // DB still holding the audit row from the first send.
      _resetTestPageCooldownsForTests();
      setBlockingCooldown(500); // DB row still present after restart.

      // A request arriving on the fresh instance must still be rate-limited.
      const second = makeRes();
      await testPageHandler(
        makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
        second.res,
      );
      expect(second.statusCode()).toBe(429);
      const body = second.body() as Record<string, unknown>;
      expect(body.error).toBe(TEST_PAGE_RATE_LIMITED_ERROR);
      expect(typeof body.retry_after_seconds).toBe('number');
      expect(body.retry_after_seconds).toBeGreaterThan(0);
      // The Retry-After hint must be consistent — it's derived from the
      // DB row's createdAt, not from instance-local expiry tracking.
      expect(second.headers()['retry-after']).toBeDefined();
      // Pager must NOT have been called on the restarted instance.
      expect(mockPager).toHaveBeenCalledTimes(1);
    });
  });
});
