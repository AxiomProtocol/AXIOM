/**
 * Tests for POST /api/scheduler/integrity-pager-wiring-check (Task #306).
 *
 * Coverage:
 *  1. Method gating — non-POST → 405.
 *  2. Auth gating — missing/wrong x-scan-key → 401 when MIRDT_SCAN_KEY
 *     is set in production. Bypass in development when key unset.
 *  3. Happy path — handler invokes the wiring-check runner once and
 *     forwards the result envelope into the JSON body.
 *  4. Runner throw — surfaces as a 500 with the error message; never
 *     leaks the raw stack.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mockRunner = vi.fn();

vi.mock('../lib/capinfra/notifications/integrityPagerWiringCheck', () => ({
  runIntegrityPagerWiringCheck: (...args: unknown[]) => mockRunner(...args),
  DEFAULT_WIRING_CHECK_ACTOR: 'scheduler:integrity-pager-wiring-check',
}));

const { default: handler } = await import(
  '../pages/api/scheduler/integrity-pager-wiring-check'
);

interface MockReqOptions {
  method?: string;
  headers?: Record<string, string>;
}

function makeReq(opts: MockReqOptions = {}): NextApiRequest {
  const { method = 'POST', headers = {} } = opts;
  return { method, headers } as NextApiRequest;
}

interface MockRes {
  res: NextApiResponse;
  statusCode(): number;
  body(): Record<string, unknown>;
}

function makeRes(): MockRes {
  let _statusCode = 200;
  let _body: Record<string, unknown> = {};
  const res = {
    status(code: number) {
      _statusCode = code;
      return res;
    },
    json(data: Record<string, unknown>) {
      _body = data;
      return res;
    },
  } as unknown as NextApiResponse;
  return {
    res,
    statusCode: () => _statusCode,
    body: () => _body,
  };
}

const savedEnv = { ...process.env };

beforeEach(() => {
  vi.resetAllMocks();
  process.env = { ...savedEnv };
  mockRunner.mockResolvedValue({
    ranAt: '2026-04-25T00:00:00.000Z',
    ok: true,
    expectedChannels: ['email'],
    channelsPaged: ['email'],
    pagerErrors: [],
    missingChannels: [],
    ownerNotified: false,
    ownerNotifyError: null,
    ownerEmailConfigured: false,
    skippedReason: null,
    persistError: null,
  });
});

afterEach(() => {
  process.env = { ...savedEnv };
});

describe('integrity-pager-wiring-check endpoint — method gating', () => {
  it('rejects GET with 405', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.MIRDT_SCAN_KEY;
    const r = makeRes();
    await handler(makeReq({ method: 'GET' }), r.res);
    expect(r.statusCode()).toBe(405);
    expect(r.body()).toEqual({
      success: false,
      error: 'Method not allowed',
    });
    expect(mockRunner).not.toHaveBeenCalled();
  });
});

describe('integrity-pager-wiring-check endpoint — auth gating', () => {
  it('rejects unauthorized requests when MIRDT_SCAN_KEY is set', async () => {
    process.env.MIRDT_SCAN_KEY = 'right-key';
    const r = makeRes();
    await handler(
      makeReq({ headers: { 'x-scan-key': 'wrong-key' } }),
      r.res,
    );
    expect(r.statusCode()).toBe(401);
    expect(mockRunner).not.toHaveBeenCalled();
  });

  it('accepts requests with the correct x-scan-key', async () => {
    process.env.MIRDT_SCAN_KEY = 'right-key';
    const r = makeRes();
    await handler(
      makeReq({ headers: { 'x-scan-key': 'right-key' } }),
      r.res,
    );
    expect(r.statusCode()).toBe(200);
    expect(mockRunner).toHaveBeenCalledTimes(1);
  });

  it('bypasses auth in development when MIRDT_SCAN_KEY is unset', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.MIRDT_SCAN_KEY;
    const r = makeRes();
    await handler(makeReq(), r.res);
    expect(r.statusCode()).toBe(200);
    expect(mockRunner).toHaveBeenCalledTimes(1);
  });

  it('does NOT bypass auth in production when MIRDT_SCAN_KEY is unset', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.MIRDT_SCAN_KEY;
    const r = makeRes();
    await handler(makeReq(), r.res);
    expect(r.statusCode()).toBe(401);
    expect(mockRunner).not.toHaveBeenCalled();
  });
});

describe('integrity-pager-wiring-check endpoint — happy path', () => {
  it('forwards the runner envelope into the JSON body', async () => {
    process.env.MIRDT_SCAN_KEY = 'right-key';
    mockRunner.mockResolvedValueOnce({
      ranAt: '2026-04-26T00:00:00.000Z',
      ok: false,
      expectedChannels: ['email', 'discord'],
      channelsPaged: ['email'],
      pagerErrors: ['discord: HTTP 404'],
      missingChannels: ['discord'],
      ownerNotified: true,
      ownerNotifyError: null,
      ownerEmailConfigured: true,
      skippedReason: null,
      persistError: null,
    });
    const r = makeRes();
    await handler(
      makeReq({ headers: { 'x-scan-key': 'right-key' } }),
      r.res,
    );
    expect(r.statusCode()).toBe(200);
    const body = r.body();
    expect(body.success).toBe(true);
    expect(body.ok).toBe(false);
    expect(body.expectedChannels).toEqual(['email', 'discord']);
    expect(body.channelsPaged).toEqual(['email']);
    expect(body.missingChannels).toEqual(['discord']);
    expect(body.pagerErrors).toEqual(['discord: HTTP 404']);
    expect(body.ownerNotified).toBe(true);
  });

  it('passes the scheduler actor and triggeredBy to the runner', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.MIRDT_SCAN_KEY;
    const r = makeRes();
    await handler(makeReq(), r.res);
    expect(mockRunner).toHaveBeenCalledWith({
      actor: 'scheduler:integrity-pager-wiring-check',
      triggeredBy: 'scheduler',
    });
  });
});

describe('integrity-pager-wiring-check endpoint — error path', () => {
  it('returns 500 with the error message when the runner throws', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.MIRDT_SCAN_KEY;
    mockRunner.mockRejectedValueOnce(new Error('runner exploded'));
    const r = makeRes();
    await handler(makeReq(), r.res);
    expect(r.statusCode()).toBe(500);
    expect(r.body()).toEqual({
      success: false,
      error: 'runner exploded',
    });
  });
});
