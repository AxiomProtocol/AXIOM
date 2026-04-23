/**
 * tests/audit-search-auth.test.ts
 *
 * Auth-layer tests for GET /api/capinfra/operator/audit.
 *
 * The audit-search endpoint exposes the full operator audit log and is
 * gated by `requireOperator(..., AUDITOR_READ_ONLY)`. SUPER_ADMIN is
 * the only role permitted to bypass the role check. A regression in
 * this gating would silently expose audit history to any authenticated
 * operator (e.g. SUPPORT_READ_ONLY), so we lock the behaviour down with
 * the same matrix used by `tests/asset-summary-auth.test.ts`:
 *
 *  1. No `x-admin-key` header → 403 Unauthorized.
 *  2. Key bound to a non-auditor role (SUPPORT_READ_ONLY) → 403
 *     ROLE_INSUFFICIENT.
 *  3. Key bound to AUDITOR_READ_ONLY → 200 (happy path).
 *  4. Key bound to SUPER_ADMIN → 200 (privileged bypass).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mockListAuditEvents = vi.fn();

vi.mock('../lib/capinfra/audit', () => ({
  listAuditEvents: (...args: unknown[]) => mockListAuditEvents(...args),
}));

const { default: auditHandler } = await import(
  '../pages/api/capinfra/operator/audit'
);

interface MockReqOptions {
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string | string[]>;
  socket?: { remoteAddress?: string };
}

function makeReq(opts: MockReqOptions = {}): NextApiRequest {
  const { method = 'GET', headers = {}, query = {}, socket } = opts;
  return {
    method,
    headers,
    query,
    socket: socket ?? { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest;
}

interface MockResResult {
  res: NextApiResponse;
  statusCode(): number;
  body(): string;
}

function makeRes(): MockResResult {
  let _statusCode = 200;
  let _body = '';
  const res = {
    status(code: number) {
      _statusCode = code;
      return res;
    },
    json(data: unknown) {
      _body = JSON.stringify(data);
      return res;
    },
    setHeader() {
      return res;
    },
  } as unknown as NextApiResponse;
  return {
    res,
    statusCode: () => _statusCode,
    body: () => _body,
  };
}

describe('GET /api/capinfra/operator/audit — auth gating', () => {
  const AUDITOR_KEY = 'test-auditor-key';
  const SUPPORT_KEY = 'test-support-key';
  const SUPER_KEY = 'test-super-admin-key';
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
    mockListAuditEvents.mockResolvedValue({ items: [], nextCursor: null });
    process.env = {
      ...savedEnv,
      // Clear the legacy fallback so it can't accidentally satisfy
      // the role check during these tests.
      ADMIN_SOLVENCY_KEY: '',
      CAPINFRA_KEY_AUDITOR_READ_ONLY: AUDITOR_KEY,
      CAPINFRA_KEY_SUPPORT_READ_ONLY: SUPPORT_KEY,
      CAPINFRA_KEY_SUPER_ADMIN: SUPER_KEY,
    };
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  it('rejects requests with no x-admin-key header as 403 Unauthorized', async () => {
    const { res, statusCode, body } = makeRes();
    await auditHandler(makeReq(), res);
    expect(statusCode()).toBe(403);
    expect(JSON.parse(body())).toMatchObject({ error: 'Unauthorized' });
    expect(mockListAuditEvents).not.toHaveBeenCalled();
  });

  it('rejects a key bound to SUPPORT_READ_ONLY with 403 ROLE_INSUFFICIENT', async () => {
    const { res, statusCode, body } = makeRes();
    await auditHandler(
      makeReq({ headers: { 'x-admin-key': SUPPORT_KEY } }),
      res,
    );
    expect(statusCode()).toBe(403);
    const parsed = JSON.parse(body());
    expect(parsed).toMatchObject({ error: 'ROLE_INSUFFICIENT' });
    expect(parsed.message).toContain('support_read_only');
    expect(parsed.message).toContain('auditor_read_only');
    expect(mockListAuditEvents).not.toHaveBeenCalled();
  });

  it('accepts a key bound to AUDITOR_READ_ONLY and returns 200', async () => {
    const { res, statusCode } = makeRes();
    await auditHandler(
      makeReq({ headers: { 'x-admin-key': AUDITOR_KEY } }),
      res,
    );
    expect(statusCode()).toBe(200);
    expect(mockListAuditEvents).toHaveBeenCalledTimes(1);
  });

  it('accepts a key bound to SUPER_ADMIN as the privileged bypass and returns 200', async () => {
    const { res, statusCode } = makeRes();
    await auditHandler(
      makeReq({ headers: { 'x-admin-key': SUPER_KEY } }),
      res,
    );
    expect(statusCode()).toBe(200);
    expect(mockListAuditEvents).toHaveBeenCalledTimes(1);
  });
});
