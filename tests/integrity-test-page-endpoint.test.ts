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
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mockPager = vi.fn();
const mockEmitAuditEvent = vi.fn();

vi.mock('../lib/capinfra/notifications/integrityPager', () => ({
  pageOnCallForIntegrityFailure: (...args: unknown[]) => mockPager(...args),
}));

vi.mock('../lib/capinfra/audit', () => ({
  emitAuditEvent: (...args: unknown[]) => mockEmitAuditEvent(...args),
}));

const {
  default: testPageHandler,
  SYNTHETIC_TEST_PAGE_ASSET_ID,
  SYNTHETIC_TEST_PAGE_KIND,
  TEST_PAGE_AUDIT_EVENT_TYPE,
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
    mockEmitAuditEvent.mockResolvedValue('ae_test');
  });

  afterEach(() => {
    process.env = savedEnv;
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

  it('writes a single audit event with the resolved actor, channels paged, and errors', async () => {
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
    expect(mockEmitAuditEvent).toHaveBeenCalledTimes(1);
    const audit = mockEmitAuditEvent.mock.calls[0][0] as Record<string, unknown>;
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
    expect(mockEmitAuditEvent).toHaveBeenCalledTimes(1);
    const audit = mockEmitAuditEvent.mock.calls[0][0] as {
      payloadJson: { channelsPaged: string[]; errors: string[]; skipped: boolean };
    };
    expect(audit.payloadJson.channelsPaged).toEqual(['email']);
    expect(audit.payloadJson.errors).toEqual(['discord: HTTP 429']);
    expect(audit.payloadJson.skipped).toBe(false);
  });

  it('records skipped=true in the audit payload when no channels are configured', async () => {
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
    expect(mockEmitAuditEvent).toHaveBeenCalledTimes(1);
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
    expect(mockEmitAuditEvent).toHaveBeenCalledTimes(1);
    const audit = mockEmitAuditEvent.mock.calls[0][0] as { actor: string };
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
    const audit = mockEmitAuditEvent.mock.calls[0][0] as { correlationId: string };
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
    expect(mockEmitAuditEvent).not.toHaveBeenCalled();
  });

  it('does not write an audit event when auth fails', async () => {
    const { res, statusCode } = makeRes();
    await testPageHandler(makeReq(), res);

    expect(statusCode()).toBe(403);
    expect(mockEmitAuditEvent).not.toHaveBeenCalled();
  });

  it('still returns 200 with the pager envelope if the audit write fails', async () => {
    // emitAuditEvent is best-effort by contract — losing one audit row
    // must not make the operator console think the page failed.
    mockEmitAuditEvent.mockResolvedValueOnce(null);
    const { res, statusCode, body } = makeRes();
    await testPageHandler(
      makeReq({ cookies: { cap_operator_key: OPERATOR_KEY } }),
      res,
    );

    expect(statusCode()).toBe(200);
    expect(body()).toEqual({
      result: { channelsPaged: ['email'], errors: [], skipped: false },
    });
  });
});
