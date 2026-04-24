/**
 * tests/operator-notifications-mark-read.test.ts
 *
 * Tests for POST /api/capinfra/operator/notifications/[id]/read.
 *
 * This endpoint is the cookie-authenticated wrapper that backs the
 * operator dashboard's "Mark read" button on the asset-integrity
 * alerts panel. Unlike the role-gated
 * /api/capinfra/notifications/[id]/read endpoint, this one accepts
 * the httpOnly `cap_operator_key` cookie set after the operator
 * login key exchange. A regression in either the cookie auth helper,
 * the markRead service contract, or the route shape would silently
 * break the dashboard's "Mark read" action — operators would only
 * notice when the row failed to disappear.
 *
 * Coverage:
 *  1. Valid operator cookie → 200, markRead called once with the id,
 *     response carries the updated `readAt` ISO string.
 *  2. Missing cookie → 401 UNAUTHORIZED, markRead NOT called.
 *  3. Invalid (wrong-value) cookie → 401 UNAUTHORIZED, markRead NOT
 *     called.
 *  4. Unknown notification id (markRead returns null) → 404 NOT_FOUND.
 *  5. Non-POST methods → 405 METHOD_NOT_ALLOWED with `Allow: POST`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mockMarkRead = vi.fn();

vi.mock('../lib/capinfra/notifications', () => ({
  markRead: (...args: unknown[]) => mockMarkRead(...args),
}));

// The handler imports `db` transitively via the notifications module
// path it shares with markRead. markRead itself is mocked above, but
// the module-level import of `../../server/db` still resolves, so we
// stub it with a chainable no-op to keep the import side-effect-free.
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
  '../pages/api/capinfra/operator/notifications/[id]/read'
);

interface MockReqOptions {
  method?: string;
  cookies?: Record<string, string>;
  query?: Record<string, string | string[]>;
  socket?: { remoteAddress?: string };
}

function makeReq(opts: MockReqOptions = {}): NextApiRequest {
  const { method = 'POST', cookies = {}, query = {}, socket } = opts;
  return {
    method,
    headers: {},
    cookies,
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

describe('POST /api/capinfra/operator/notifications/[id]/read', () => {
  const OPERATOR_KEY = 'test-operator-key';
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...savedEnv,
      ADMIN_SOLVENCY_KEY: OPERATOR_KEY,
    };
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  it('returns 200 and the updated readAt for a valid operator cookie', async () => {
    const readAt = new Date('2026-04-24T12:34:56.000Z');
    mockMarkRead.mockResolvedValueOnce({ id: 'ntf_abc', readAt });

    const { res, statusCode, body } = makeRes();
    await markReadHandler(
      makeReq({
        cookies: { cap_operator_key: OPERATOR_KEY },
        query: { id: 'ntf_abc' },
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

  it('returns 401 and does not call markRead when the cookie is missing', async () => {
    const { res, statusCode, body } = makeRes();
    await markReadHandler(
      makeReq({ query: { id: 'ntf_abc' } }),
      res,
    );

    expect(statusCode()).toBe(401);
    expect(JSON.parse(body())).toMatchObject({ error: 'UNAUTHORIZED' });
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it('returns 401 and does not call markRead when the cookie value is wrong', async () => {
    const { res, statusCode, body } = makeRes();
    await markReadHandler(
      makeReq({
        cookies: { cap_operator_key: 'not-the-real-key' },
        query: { id: 'ntf_abc' },
      }),
      res,
    );

    expect(statusCode()).toBe(401);
    expect(JSON.parse(body())).toMatchObject({ error: 'UNAUTHORIZED' });
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it('returns 404 when markRead reports an unknown notification id', async () => {
    mockMarkRead.mockResolvedValueOnce(null);

    const { res, statusCode, body } = makeRes();
    await markReadHandler(
      makeReq({
        cookies: { cap_operator_key: OPERATOR_KEY },
        query: { id: 'ntf_does_not_exist' },
      }),
      res,
    );

    expect(statusCode()).toBe(404);
    expect(JSON.parse(body())).toMatchObject({ error: 'NOT_FOUND' });
    expect(mockMarkRead).toHaveBeenCalledTimes(1);
    expect(mockMarkRead).toHaveBeenCalledWith('ntf_does_not_exist');
  });

  it('returns 405 with Allow: POST for non-POST methods', async () => {
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
      const { res, statusCode, body, headers } = makeRes();
      await markReadHandler(
        makeReq({
          method,
          cookies: { cap_operator_key: OPERATOR_KEY },
          query: { id: 'ntf_abc' },
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
