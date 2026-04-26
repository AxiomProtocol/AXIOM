/**
 * tests/operator-notifications-mark-read-batch.test.ts
 *
 * Tests for POST /api/capinfra/operator/notifications/mark-read-batch.
 *
 * The dashboard's "Mark all read" action calls this endpoint to clear
 * a batch of asset-integrity alert rows in one click. Operators have
 * no per-row visibility into how often the batch path is used or how
 * many rows each click cleared, so the endpoint emits an audit event
 * (`operator.notifications.batch_mark_read`) on every successful
 * batch — capturing operator key fingerprint, attempted count, marked
 * count, not-found count, and failed count.
 *
 * This test asserts the audit-event side effect is wired up correctly.
 * It does NOT re-test the batch shape itself (covered by the panel
 * integration test) — it exists only to lock in the audit emission so
 * a future refactor can't silently drop it.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mockMarkRead = vi.fn();
const mockEmitAuditEvent = vi.fn();

vi.mock('../lib/capinfra/notifications', () => ({
  markRead: (...args: unknown[]) => mockMarkRead(...args),
}));

vi.mock('../lib/capinfra/audit', () => ({
  emitAuditEvent: (...args: unknown[]) => mockEmitAuditEvent(...args),
}));

// Stub the db import chain so the handler module loads without a live
// Postgres connection (markRead and emitAuditEvent are both mocked).
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

const { default: batchHandler } = await import(
  '../pages/api/capinfra/operator/notifications/mark-read-batch'
);

interface MockReqOptions {
  method?: string;
  cookies?: Record<string, string>;
  body?: unknown;
}

function makeReq(opts: MockReqOptions = {}): NextApiRequest {
  const { method = 'POST', cookies = {}, body = {} } = opts;
  return {
    method,
    headers: {},
    cookies,
    body,
    query: {},
    socket: { remoteAddress: '127.0.0.1' },
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

describe('POST /api/capinfra/operator/notifications/mark-read-batch — audit emission', () => {
  const OPERATOR_KEY = 'test-operator-key';
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEmitAuditEvent.mockResolvedValue('ae_test_audit_id');
    process.env = {
      ...savedEnv,
      ADMIN_SOLVENCY_KEY: OPERATOR_KEY,
    };
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  it('writes a batch-mark-read audit event with attempted, marked, notFound, failed counts', async () => {
    // 3 ids: one marks ok, one is not found (markRead → null), one
    // throws. The audit event must capture all three buckets so a
    // partial-failure batch is visible in the audit log.
    mockMarkRead
      .mockResolvedValueOnce({ id: 'ntf_a', readAt: new Date('2026-04-26T00:00:00Z') })
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('boom'));

    const { res, statusCode, body } = makeRes();
    await batchHandler(
      makeReq({
        cookies: { cap_operator_key: OPERATOR_KEY },
        body: { ids: ['ntf_a', 'ntf_b', 'ntf_c'] },
      }),
      res,
    );

    expect(statusCode()).toBe(200);
    const parsed = JSON.parse(body());
    expect(parsed.attempted).toBe(3);
    expect(parsed.marked).toEqual(['ntf_a']);
    expect(parsed.notFound).toEqual(['ntf_b']);
    expect(parsed.failed).toEqual([{ id: 'ntf_c', error: 'boom' }]);

    expect(mockEmitAuditEvent).toHaveBeenCalledTimes(1);
    const auditCall = mockEmitAuditEvent.mock.calls[0][0];
    expect(auditCall.eventType).toBe('operator.notifications.batch_mark_read');
    expect(auditCall.aggregateType).toBe('operator.notifications');
    expect(typeof auditCall.aggregateId).toBe('string');
    expect(auditCall.aggregateId.length).toBeGreaterThan(0);

    // operator key id is a sha256 fingerprint, never the raw key.
    expect(typeof auditCall.actor).toBe('string');
    expect(auditCall.actor).toMatch(/^opk_[0-9a-f]{12}$/);
    expect(auditCall.actor).not.toContain(OPERATOR_KEY);

    expect(auditCall.payloadJson).toMatchObject({
      operatorKeyId: auditCall.actor,
      attempted: 3,
      markedCount: 1,
      notFoundCount: 1,
      failedCount: 1,
      markedIds: ['ntf_a'],
      notFoundIds: ['ntf_b'],
      failedIds: ['ntf_c'],
    });
  });

  it('emits an audit event even when every id marks successfully (counts reflect the all-clear case)', async () => {
    mockMarkRead
      .mockResolvedValueOnce({ id: 'ntf_1', readAt: new Date() })
      .mockResolvedValueOnce({ id: 'ntf_2', readAt: new Date() });

    const { res, statusCode } = makeRes();
    await batchHandler(
      makeReq({
        cookies: { cap_operator_key: OPERATOR_KEY },
        body: { ids: ['ntf_1', 'ntf_2'] },
      }),
      res,
    );

    expect(statusCode()).toBe(200);
    expect(mockEmitAuditEvent).toHaveBeenCalledTimes(1);
    const auditCall = mockEmitAuditEvent.mock.calls[0][0];
    expect(auditCall.eventType).toBe('operator.notifications.batch_mark_read');
    expect(auditCall.payloadJson).toMatchObject({
      attempted: 2,
      markedCount: 2,
      notFoundCount: 0,
      failedCount: 0,
      markedIds: ['ntf_1', 'ntf_2'],
      notFoundIds: [],
      failedIds: [],
    });
  });

  it('does NOT emit an audit event when auth fails (no UNAUTHORIZED rows in the audit log)', async () => {
    const { res, statusCode } = makeRes();
    await batchHandler(
      makeReq({
        cookies: { cap_operator_key: 'wrong-key' },
        body: { ids: ['ntf_a'] },
      }),
      res,
    );

    expect(statusCode()).toBe(401);
    expect(mockEmitAuditEvent).not.toHaveBeenCalled();
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it('does NOT emit an audit event when the body is invalid (no audit noise from malformed requests)', async () => {
    const { res, statusCode } = makeRes();
    await batchHandler(
      makeReq({
        cookies: { cap_operator_key: OPERATOR_KEY },
        body: { ids: 'not-an-array' },
      }),
      res,
    );

    expect(statusCode()).toBe(400);
    expect(mockEmitAuditEvent).not.toHaveBeenCalled();
    expect(mockMarkRead).not.toHaveBeenCalled();
  });
});
