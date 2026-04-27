/**
 * tests/mark-unread-batch.test.ts
 *
 * Tests for POST /api/capinfra/operator/notifications/mark-unread-batch.
 *
 * This endpoint is the "Undo" counterpart of mark-read-batch: it flips
 * `readAt` back to null for a list of notification ids. It is
 * cookie-authenticated (same surface as mark-read-batch) and audited.
 *
 * Coverage:
 *  1. Valid cookie → 200, markUnread called once per id, response body
 *     matches the attempted/marked/notFound/failed shape.
 *  2. markUnread returning null for an id → that id goes into notFound.
 *  3. markUnread throwing for an id → that id goes into failed; others
 *     still succeed (per-id isolation).
 *  4. Missing/invalid cookie → 401 UNAUTHORIZED, markUnread not called.
 *  5. Non-POST method → 405 METHOD_NOT_ALLOWED with Allow: POST.
 *  6. Missing ids field → 400 MISSING_IDS.
 *  7. Empty ids array (after normalization) → 400 EMPTY_IDS.
 *  8. Batch exceeding MAX_BATCH → 400 BATCH_TOO_LARGE.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mockMarkUnread = vi.fn();
const mockEmitAuditEvent = vi.fn(async () => undefined);
const mockGenerateId = vi.fn(() => 'ae_test_id');

vi.mock('../lib/capinfra/notifications', () => ({
  markUnread: (...args: unknown[]) => mockMarkUnread(...args),
}));

vi.mock('../lib/capinfra/audit', () => ({
  emitAuditEvent: (...args: unknown[]) => mockEmitAuditEvent(...args),
}));

vi.mock('../lib/capinfra/ids', () => ({
  generateId: (...args: unknown[]) => mockGenerateId(...args),
}));

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

const VALID_OPERATOR_COOKIE = 'test-operator-cookie-value';

vi.mock('../lib/capinfra/operatorAuth', () => ({
  readOperatorCookie: (req: NextApiRequest) =>
    req.cookies?.['operator_key'] ?? null,
  isValidOperatorKey: (key: unknown) => key === VALID_OPERATOR_COOKIE,
}));

const { default: markUnreadBatchHandler } = await import(
  '../pages/api/capinfra/operator/notifications/mark-unread-batch'
);

function makeReq(opts: {
  method?: string;
  cookies?: Record<string, string>;
  body?: unknown;
}): NextApiRequest {
  const { method = 'POST', cookies = {}, body = {} } = opts;
  return {
    method,
    headers: {},
    cookies,
    body,
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest;
}

function makeRes() {
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
    bodyParsed: () => JSON.parse(_body) as unknown,
    headers: () => _headers,
  };
}

const AUTHED_COOKIES = { operator_key: VALID_OPERATOR_COOKIE };

describe('POST /api/capinfra/operator/notifications/mark-unread-batch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with correct shape when all ids are unmarked successfully', async () => {
    mockMarkUnread
      .mockResolvedValueOnce({ id: 'ntf_a' })
      .mockResolvedValueOnce({ id: 'ntf_b' });

    const { res, statusCode, bodyParsed } = makeRes();
    await markUnreadBatchHandler(
      makeReq({ cookies: AUTHED_COOKIES, body: { ids: ['ntf_a', 'ntf_b'] } }),
      res,
    );

    expect(statusCode()).toBe(200);
    expect(bodyParsed()).toEqual({
      attempted: 2,
      marked: ['ntf_a', 'ntf_b'],
      notFound: [],
      failed: [],
    });
    expect(mockMarkUnread).toHaveBeenCalledTimes(2);
    expect(mockMarkUnread).toHaveBeenCalledWith('ntf_a');
    expect(mockMarkUnread).toHaveBeenCalledWith('ntf_b');
    expect(mockEmitAuditEvent).toHaveBeenCalledTimes(1);
    const auditCall = mockEmitAuditEvent.mock.calls[0][0] as {
      eventType: string;
      payloadJson: { markedCount: number };
    };
    expect(auditCall.eventType).toBe('operator.notifications.batch_mark_unread');
    expect(auditCall.payloadJson.markedCount).toBe(2);
  });

  it('puts an id in notFound when markUnread returns null', async () => {
    mockMarkUnread
      .mockResolvedValueOnce({ id: 'ntf_a' })
      .mockResolvedValueOnce(null);

    const { res, statusCode, bodyParsed } = makeRes();
    await markUnreadBatchHandler(
      makeReq({
        cookies: AUTHED_COOKIES,
        body: { ids: ['ntf_a', 'ntf_missing'] },
      }),
      res,
    );

    expect(statusCode()).toBe(200);
    expect(bodyParsed()).toEqual({
      attempted: 2,
      marked: ['ntf_a'],
      notFound: ['ntf_missing'],
      failed: [],
    });
  });

  it('puts an id in failed when markUnread throws, and still processes other ids', async () => {
    mockMarkUnread
      .mockRejectedValueOnce(new Error('db timeout'))
      .mockResolvedValueOnce({ id: 'ntf_b' });

    const { res, statusCode, bodyParsed } = makeRes();
    await markUnreadBatchHandler(
      makeReq({
        cookies: AUTHED_COOKIES,
        body: { ids: ['ntf_err', 'ntf_b'] },
      }),
      res,
    );

    expect(statusCode()).toBe(200);
    const parsed = bodyParsed() as {
      attempted: number;
      marked: string[];
      notFound: string[];
      failed: { id: string; error: string }[];
    };
    expect(parsed.attempted).toBe(2);
    expect(parsed.marked).toEqual(['ntf_b']);
    expect(parsed.notFound).toEqual([]);
    expect(parsed.failed).toHaveLength(1);
    expect(parsed.failed[0].id).toBe('ntf_err');
    expect(parsed.failed[0].error).toMatch(/db timeout/);
  });

  it('returns 401 UNAUTHORIZED when the cookie is missing', async () => {
    const { res, statusCode, bodyParsed } = makeRes();
    await markUnreadBatchHandler(
      makeReq({ body: { ids: ['ntf_a'] } }),
      res,
    );

    expect(statusCode()).toBe(401);
    expect(bodyParsed()).toMatchObject({ error: 'UNAUTHORIZED' });
    expect(mockMarkUnread).not.toHaveBeenCalled();
  });

  it('returns 401 UNAUTHORIZED when the cookie value is wrong', async () => {
    const { res, statusCode, bodyParsed } = makeRes();
    await markUnreadBatchHandler(
      makeReq({
        cookies: { operator_key: 'wrong-value' },
        body: { ids: ['ntf_a'] },
      }),
      res,
    );

    expect(statusCode()).toBe(401);
    expect(bodyParsed()).toMatchObject({ error: 'UNAUTHORIZED' });
    expect(mockMarkUnread).not.toHaveBeenCalled();
  });

  it('returns 405 METHOD_NOT_ALLOWED with Allow: POST for non-POST methods', async () => {
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
      const { res, statusCode, bodyParsed, headers } = makeRes();
      await markUnreadBatchHandler(
        makeReq({ method, cookies: AUTHED_COOKIES, body: { ids: ['ntf_a'] } }),
        res,
      );

      expect(statusCode()).toBe(405);
      expect(bodyParsed()).toMatchObject({ error: 'METHOD_NOT_ALLOWED' });
      expect(headers()['allow']).toBe('POST');
      expect(mockMarkUnread).not.toHaveBeenCalled();
    }
  });

  it('returns 400 MISSING_IDS when the ids field is absent', async () => {
    const { res, statusCode, bodyParsed } = makeRes();
    await markUnreadBatchHandler(
      makeReq({ cookies: AUTHED_COOKIES, body: {} }),
      res,
    );

    expect(statusCode()).toBe(400);
    expect(bodyParsed()).toMatchObject({ error: 'MISSING_IDS' });
    expect(mockMarkUnread).not.toHaveBeenCalled();
  });

  it('returns 400 EMPTY_IDS when all ids normalize to empty strings', async () => {
    const { res, statusCode, bodyParsed } = makeRes();
    await markUnreadBatchHandler(
      makeReq({ cookies: AUTHED_COOKIES, body: { ids: ['   ', ''] } }),
      res,
    );

    expect(statusCode()).toBe(400);
    expect(bodyParsed()).toMatchObject({ error: 'EMPTY_IDS' });
    expect(mockMarkUnread).not.toHaveBeenCalled();
  });

  it('returns 400 BATCH_TOO_LARGE when more than 200 ids are submitted', async () => {
    const ids = Array.from({ length: 201 }, (_, i) => `ntf_${i}`);
    const { res, statusCode, bodyParsed } = makeRes();
    await markUnreadBatchHandler(
      makeReq({ cookies: AUTHED_COOKIES, body: { ids } }),
      res,
    );

    expect(statusCode()).toBe(400);
    const parsed = bodyParsed() as { error: string; max: number };
    expect(parsed.error).toBe('BATCH_TOO_LARGE');
    expect(parsed.max).toBe(200);
    expect(mockMarkUnread).not.toHaveBeenCalled();
  });

  it('deduplicates ids so markUnread is called at most once per unique id', async () => {
    mockMarkUnread.mockResolvedValue({ id: 'ntf_a' });

    const { res, statusCode, bodyParsed } = makeRes();
    await markUnreadBatchHandler(
      makeReq({
        cookies: AUTHED_COOKIES,
        body: { ids: ['ntf_a', 'ntf_a', 'ntf_a'] },
      }),
      res,
    );

    expect(statusCode()).toBe(200);
    expect(mockMarkUnread).toHaveBeenCalledTimes(1);
    const parsed = bodyParsed() as { attempted: number };
    expect(parsed.attempted).toBe(1);
  });
});
