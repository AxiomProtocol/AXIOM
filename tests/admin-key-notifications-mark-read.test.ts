/**
 * tests/admin-key-notifications-mark-read.test.ts
 *
 * Tests for POST /api/capinfra/notifications/[id]/read.
 *
 * This endpoint is the role-gated sibling of the cookie-authenticated
 * /api/capinfra/operator/notifications/[id]/read endpoint. It runs the
 * same `markRead` write but is intended for external/automated clients
 * authenticating with an `x-admin-key` header bound to a capinfra role
 * (`SUPPORT_READ_ONLY` or higher via `requireOperator`). A regression
 * in either the role gate, the markRead service contract, or the route
 * shape would silently break automated mark-read clients, so we lock
 * the behaviour down with explicit coverage:
 *
 *  1. Valid `x-admin-key` bound to SUPPORT_READ_ONLY → 200, markRead
 *     called once with the id, response carries the updated `readAt`
 *     ISO string.
 *  2. Missing header → 403 Unauthorized, markRead NOT called.
 *  3. Invalid (unknown) header value → 403 Unauthorized, markRead NOT
 *     called.
 *  4. Key bound to an unauthorized role (AUDITOR_READ_ONLY) →
 *     403 ROLE_INSUFFICIENT, markRead NOT called.
 *  5. SUPER_ADMIN → 200 (privileged bypass), markRead called.
 *  6. Unknown notification id (markRead returns null) → 404 NOT_FOUND.
 *  7. Non-POST methods → 405 METHOD_NOT_ALLOWED with `Allow: POST`,
 *     and markRead NOT called (method check runs before auth).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mockMarkRead = vi.fn();

vi.mock('../lib/capinfra/notifications', () => ({
  markRead: (...args: unknown[]) => mockMarkRead(...args),
}));

// The handler imports `db` transitively via the notifications module.
// markRead itself is mocked above, but the module-level import of
// `../../server/db` still resolves, so we stub it with a chainable
// no-op to keep the import side-effect-free.
vi.mock('../server/db', () => {
  const chain: Record<string, unknown> = {};
  const passthrough = () => chain;
  chain.select = passthrough;
  chain.from = passthrough;
  chain.where = passthrough;
  chain.orderBy = passthrough;
  chain.limit = async () => [] as unknown[];
  chain.update = passthrough;
  chain.set = passthrough;
  chain.returning = async () => [] as unknown[];
  chain.insert = passthrough;
  chain.values = async () => undefined;
  return { db: chain };
});

const { default: markReadHandler } = await import(
  '../pages/api/capinfra/notifications/[id]/read'
);

interface MockReqOptions {
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string | string[]>;
  socket?: { remoteAddress?: string };
}

function makeReq(opts: MockReqOptions = {}): NextApiRequest {
  const { method = 'POST', headers = {}, query = {}, socket } = opts;
  return {
    method,
    headers,
    cookies: {},
    query,
    socket: socket ?? { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest;
}

interface MockResResult {
  res: NextApiResponse;
  statusCode(): number;
  body(): string;
  headers(): Record<string, string>;
}

function makeRes(): MockResResult {
  let _statusCode = 200;
  let _body = '';
  const _headers: Record<string, string> = {};
  const res = {
    status(code: number) {
      _statusCode = code;
      return res;
    },
    json(data: unknown) {
      _body = JSON.stringify(data);
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

describe('POST /api/capinfra/notifications/[id]/read — admin-key auth', () => {
  const SUPPORT_KEY = 'test-support-read-only-key';
  const AUDITOR_KEY = 'test-auditor-read-only-key';
  const SUPER_KEY = 'test-super-admin-key';
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...savedEnv,
      // Clear the legacy fallback so it can't accidentally satisfy the
      // role check during these tests.
      ADMIN_SOLVENCY_KEY: '',
      CAPINFRA_KEY_SUPPORT_READ_ONLY: SUPPORT_KEY,
      CAPINFRA_KEY_AUDITOR_READ_ONLY: AUDITOR_KEY,
      CAPINFRA_KEY_SUPER_ADMIN: SUPER_KEY,
    };
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  it('returns 200 and the updated readAt for a valid SUPPORT_READ_ONLY key', async () => {
    const readAt = new Date('2026-04-24T12:34:56.000Z');
    mockMarkRead.mockResolvedValueOnce({ id: 'ntf_abc', readAt });

    const { res, statusCode, body } = makeRes();
    await markReadHandler(
      makeReq({
        headers: { 'x-admin-key': SUPPORT_KEY },
        query: { id: 'ntf_abc' },
        socket: { remoteAddress: '10.0.0.1' },
      }),
      res,
    );

    expect(statusCode()).toBe(200);
    expect(JSON.parse(body())).toEqual({
      notification: {
        id: 'ntf_abc',
        readAt: '2026-04-24T12:34:56.000Z',
      },
    });
    expect(mockMarkRead).toHaveBeenCalledTimes(1);
    expect(mockMarkRead).toHaveBeenCalledWith('ntf_abc');
  });

  it('returns 200 for a SUPER_ADMIN key (privileged bypass)', async () => {
    const readAt = new Date('2026-04-24T13:00:00.000Z');
    mockMarkRead.mockResolvedValueOnce({ id: 'ntf_xyz', readAt });

    const { res, statusCode, body } = makeRes();
    await markReadHandler(
      makeReq({
        headers: { 'x-admin-key': SUPER_KEY },
        query: { id: 'ntf_xyz' },
        socket: { remoteAddress: '10.0.0.2' },
      }),
      res,
    );

    expect(statusCode()).toBe(200);
    expect(JSON.parse(body())).toEqual({
      notification: {
        id: 'ntf_xyz',
        readAt: '2026-04-24T13:00:00.000Z',
      },
    });
    expect(mockMarkRead).toHaveBeenCalledTimes(1);
    expect(mockMarkRead).toHaveBeenCalledWith('ntf_xyz');
  });

  it('returns 403 Unauthorized and does not call markRead when the x-admin-key header is missing', async () => {
    const { res, statusCode, body } = makeRes();
    await markReadHandler(
      makeReq({
        query: { id: 'ntf_abc' },
        socket: { remoteAddress: '10.0.0.3' },
      }),
      res,
    );

    expect(statusCode()).toBe(403);
    expect(JSON.parse(body())).toMatchObject({ error: 'Unauthorized' });
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it('returns 403 Unauthorized and does not call markRead when the x-admin-key value is unknown', async () => {
    const { res, statusCode, body } = makeRes();
    await markReadHandler(
      makeReq({
        headers: { 'x-admin-key': 'not-a-real-key' },
        query: { id: 'ntf_abc' },
        socket: { remoteAddress: '10.0.0.4' },
      }),
      res,
    );

    expect(statusCode()).toBe(403);
    expect(JSON.parse(body())).toMatchObject({ error: 'Unauthorized' });
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it('returns 403 ROLE_INSUFFICIENT when the key is bound to an unauthorized role', async () => {
    const { res, statusCode, body } = makeRes();
    await markReadHandler(
      makeReq({
        headers: { 'x-admin-key': AUDITOR_KEY },
        query: { id: 'ntf_abc' },
        socket: { remoteAddress: '10.0.0.5' },
      }),
      res,
    );

    expect(statusCode()).toBe(403);
    const parsed = JSON.parse(body());
    expect(parsed).toMatchObject({ error: 'ROLE_INSUFFICIENT' });
    // Diagnostic message names both the presented role and the role
    // the route requires so misconfigurations are obvious from the
    // response alone.
    expect(parsed.message).toContain('auditor_read_only');
    expect(parsed.message).toContain('support_read_only');
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it('returns 404 NOT_FOUND when markRead reports an unknown notification id', async () => {
    mockMarkRead.mockResolvedValueOnce(null);

    const { res, statusCode, body } = makeRes();
    await markReadHandler(
      makeReq({
        headers: { 'x-admin-key': SUPPORT_KEY },
        query: { id: 'ntf_does_not_exist' },
        socket: { remoteAddress: '10.0.0.6' },
      }),
      res,
    );

    expect(statusCode()).toBe(404);
    expect(JSON.parse(body())).toMatchObject({ error: 'NOT_FOUND' });
    expect(mockMarkRead).toHaveBeenCalledTimes(1);
    expect(mockMarkRead).toHaveBeenCalledWith('ntf_does_not_exist');
  });

  it('returns 405 METHOD_NOT_ALLOWED with Allow: POST for non-POST methods', async () => {
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
      const { res, statusCode, body, headers } = makeRes();
      await markReadHandler(
        makeReq({
          method,
          headers: { 'x-admin-key': SUPPORT_KEY },
          query: { id: 'ntf_abc' },
          socket: { remoteAddress: '10.0.0.7' },
        }),
        res,
      );

      expect(statusCode()).toBe(405);
      expect(JSON.parse(body())).toMatchObject({ error: 'METHOD_NOT_ALLOWED' });
      expect(headers().allow).toBe('POST');
      expect(mockMarkRead).not.toHaveBeenCalled();
    }
  });
});
