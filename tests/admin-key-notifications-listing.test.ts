/**
 * tests/admin-key-notifications-listing.test.ts
 *
 * Tests for GET /api/capinfra/notifications.
 *
 * This endpoint is the role-gated, admin-key-authenticated listing
 * sibling of the operator cookie-auth listing endpoint. It runs
 * `requireOperator(SUPPORT_READ_ONLY)` and parses the query string
 * with `ZNotificationsListQuery`. A regression in either the role gate,
 * the query schema, or the route shape would silently break automated
 * readers, so we lock the behaviour down with explicit coverage:
 *
 *  1. Valid `x-admin-key` bound to SUPPORT_READ_ONLY → 200, items
 *     from `listNotifications` returned.
 *  2. SUPER_ADMIN → 200 (privileged bypass), `listNotifications` called.
 *  3. Missing header → 403 Unauthorized, `listNotifications` NOT called.
 *  4. Unknown header value → 403 Unauthorized, `listNotifications` NOT
 *     called.
 *  5. Key bound to an unauthorized role (AUDITOR_READ_ONLY) →
 *     403 ROLE_INSUFFICIENT, `listNotifications` NOT called.
 *  6. Invalid query parameter (non-numeric `limit`) → 400
 *     VALIDATION_ERROR, `listNotifications` NOT called.
 *  7. Non-GET methods → 405 METHOD_NOT_ALLOWED with `Allow: GET`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mockListNotifications = vi.fn();

vi.mock('../lib/capinfra/notifications', () => ({
  listNotifications: (...args: unknown[]) => mockListNotifications(...args),
}));

// The handler imports `db` transitively via the notifications module.
// listNotifications itself is mocked above, but the module-level import of
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

const { default: notificationsHandler } = await import(
  '../pages/api/capinfra/notifications/index'
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

describe('GET /api/capinfra/notifications — admin-key auth', () => {
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

  it('returns 200 with items for a valid SUPPORT_READ_ONLY key', async () => {
    const fakeItems = [
      { id: 'ntf_001', subject: 'Test notification', readAt: null },
      { id: 'ntf_002', subject: 'Another notification', readAt: '2026-04-24T10:00:00.000Z' },
    ];
    mockListNotifications.mockResolvedValueOnce(fakeItems);

    const { res, statusCode, body } = makeRes();
    await notificationsHandler(
      makeReq({
        headers: { 'x-admin-key': SUPPORT_KEY },
        socket: { remoteAddress: '10.0.0.1' },
      }),
      res,
    );

    expect(statusCode()).toBe(200);
    expect(JSON.parse(body())).toEqual({ items: fakeItems });
    expect(mockListNotifications).toHaveBeenCalledTimes(1);
  });

  it('returns 200 for a SUPER_ADMIN key (privileged bypass)', async () => {
    const fakeItems = [{ id: 'ntf_xyz', subject: 'Super admin view', readAt: null }];
    mockListNotifications.mockResolvedValueOnce(fakeItems);

    const { res, statusCode, body } = makeRes();
    await notificationsHandler(
      makeReq({
        headers: { 'x-admin-key': SUPER_KEY },
        socket: { remoteAddress: '10.0.0.2' },
      }),
      res,
    );

    expect(statusCode()).toBe(200);
    expect(JSON.parse(body())).toEqual({ items: fakeItems });
    expect(mockListNotifications).toHaveBeenCalledTimes(1);
  });

  it('returns 403 Unauthorized and does not call listNotifications when the x-admin-key header is missing', async () => {
    const { res, statusCode, body } = makeRes();
    await notificationsHandler(
      makeReq({
        socket: { remoteAddress: '10.0.0.3' },
      }),
      res,
    );

    expect(statusCode()).toBe(403);
    expect(JSON.parse(body())).toMatchObject({ error: 'Unauthorized' });
    expect(mockListNotifications).not.toHaveBeenCalled();
  });

  it('returns 403 Unauthorized and does not call listNotifications when the x-admin-key value is unknown', async () => {
    const { res, statusCode, body } = makeRes();
    await notificationsHandler(
      makeReq({
        headers: { 'x-admin-key': 'not-a-real-key' },
        socket: { remoteAddress: '10.0.0.4' },
      }),
      res,
    );

    expect(statusCode()).toBe(403);
    expect(JSON.parse(body())).toMatchObject({ error: 'Unauthorized' });
    expect(mockListNotifications).not.toHaveBeenCalled();
  });

  it('returns 403 ROLE_INSUFFICIENT when the key is bound to an unauthorized role', async () => {
    const { res, statusCode, body } = makeRes();
    await notificationsHandler(
      makeReq({
        headers: { 'x-admin-key': AUDITOR_KEY },
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
    expect(mockListNotifications).not.toHaveBeenCalled();
  });

  it('returns 400 VALIDATION_ERROR and does not call listNotifications for an invalid limit query param', async () => {
    const { res, statusCode, body } = makeRes();
    await notificationsHandler(
      makeReq({
        headers: { 'x-admin-key': SUPPORT_KEY },
        query: { limit: 'not-a-number' },
        socket: { remoteAddress: '10.0.0.6' },
      }),
      res,
    );

    expect(statusCode()).toBe(400);
    expect(JSON.parse(body())).toMatchObject({ error: 'VALIDATION_ERROR' });
    expect(mockListNotifications).not.toHaveBeenCalled();
  });

  it('returns 405 METHOD_NOT_ALLOWED with Allow: GET for non-GET methods', async () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      const { res, statusCode, body, headers } = makeRes();
      await notificationsHandler(
        makeReq({
          method,
          headers: { 'x-admin-key': SUPPORT_KEY },
          socket: { remoteAddress: '10.0.0.7' },
        }),
        res,
      );

      expect(statusCode()).toBe(405);
      expect(JSON.parse(body())).toMatchObject({ error: 'METHOD_NOT_ALLOWED' });
      expect(headers().allow).toBe('GET');
      expect(mockListNotifications).not.toHaveBeenCalled();
    }
  });
});
