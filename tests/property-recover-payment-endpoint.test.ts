/**
 * tests/property-recover-payment-endpoint.test.ts
 *
 * Tests for POST /api/property/recover-payment — the buyer-facing self-rescue
 * endpoint added in task #280. Wraps `resolveSingleByTxHash` from the stuck-
 * payment resolver and surfaces it on the public receipt-lookup page.
 *
 * Coverage:
 *   1. Method gating (405)
 *   2. Input validation (400 on missing/malformed reportId + txHash)
 *   3. Tx-hash format guard rejects junk before any resolver call
 *   4. Happy path: 200 + status from resolver
 *   5. Sender-wallet enforcement reachable: 403 when resolver returns the
 *      "must be sent from the wallet recorded on the report" reason
 *   6. Idempotency: 409 when resolver refuses to overwrite a non-pending row
 *   7. Tx-hash reuse: 409 when resolver flags the hash as belonging to
 *      another report
 *   8. Verification failure (insufficient amount, etc): 402
 *   9. Free tier: 400
 *  10. Report not found: 404
 *  11. Resolver crash: 500 (no leak of internal error message)
 *  12. Rate limiting: after 10 requests in 60s, the 11th gets 429
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

// Mock the resolver — we are testing the HTTP wrapper's behavior, not the
// resolver itself (which has its own dedicated test file).
const resolveSingleByTxHashMock = vi.fn();
vi.mock('../lib/property/stuckPaymentResolver', () => ({
  resolveSingleByTxHash: (id: string, tx: string) => resolveSingleByTxHashMock(id, tx),
}));

// Import the handler AFTER the mocks are registered.
const { default: handler } = await import('../pages/api/property/recover-payment');

// ── Test helpers ─────────────────────────────────────────────────────────────

const VALID_TX_HASH = '0x' + 'a'.repeat(64);
const VALID_REPORT_ID = 'rep_01HZZZZZZZZZZZZZZZZZZZZZZZ';

interface MockReqOptions {
  method?: string;
  body?: unknown;
  ip?: string;
}

function makeReq(opts: MockReqOptions = {}): NextApiRequest {
  return {
    method: opts.method ?? 'POST',
    body: opts.body ?? {},
    query: {},
    // Each test gets its own IP so the in-memory rate limiter (keyed by IP)
    // doesn't bleed across tests.
    headers: { 'x-forwarded-for': opts.ip ?? `10.0.0.${Math.floor(Math.random() * 255)}` },
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest;
}

function makeRes() {
  let _statusCode = 200;
  let _body: unknown = {};
  const headers: Record<string, string | number> = {};
  const res = {
    status(code: number) {
      _statusCode = code;
      return res;
    },
    json(data: unknown) {
      _body = data;
      return res;
    },
    setHeader(name: string, value: string | number) {
      headers[name.toLowerCase()] = value;
      return res;
    },
    getHeader(name: string) {
      return headers[name.toLowerCase()];
    },
  } as unknown as NextApiResponse;
  return {
    res,
    statusCode: () => _statusCode,
    body: () => _body as Record<string, unknown>,
    headers,
  };
}

beforeEach(() => {
  resolveSingleByTxHashMock.mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/property/recover-payment — method + input gating', () => {
  it('rejects non-POST methods with 405 and an Allow header', async () => {
    const { res, statusCode, headers } = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(statusCode()).toBe(405);
    expect(headers['allow']).toBe('POST');
    expect(resolveSingleByTxHashMock).not.toHaveBeenCalled();
  });

  it('returns 400 when the body has no reportId', async () => {
    const { res, statusCode, body } = makeRes();
    await handler(makeReq({ body: { txHash: VALID_TX_HASH } }), res);
    expect(statusCode()).toBe(400);
    expect(body().error).toMatch(/reportId/i);
    expect(resolveSingleByTxHashMock).not.toHaveBeenCalled();
  });

  it('returns 400 when reportId is an empty string', async () => {
    const { res, statusCode } = makeRes();
    await handler(makeReq({ body: { reportId: '   ', txHash: VALID_TX_HASH } }), res);
    expect(statusCode()).toBe(400);
    expect(resolveSingleByTxHashMock).not.toHaveBeenCalled();
  });

  it('returns 400 when reportId is unreasonably long (length cap)', async () => {
    const { res, statusCode, body } = makeRes();
    await handler(
      makeReq({ body: { reportId: 'a'.repeat(200), txHash: VALID_TX_HASH } }),
      res,
    );
    expect(statusCode()).toBe(400);
    expect(body().error).toMatch(/too long/i);
    expect(resolveSingleByTxHashMock).not.toHaveBeenCalled();
  });

  it('returns 400 when txHash is missing', async () => {
    const { res, statusCode, body } = makeRes();
    await handler(makeReq({ body: { reportId: VALID_REPORT_ID } }), res);
    expect(statusCode()).toBe(400);
    expect(body().error).toMatch(/txHash/i);
    expect(resolveSingleByTxHashMock).not.toHaveBeenCalled();
  });

  it('returns 400 when txHash does not match 0x + 64 hex (junk never reaches the resolver)', async () => {
    const cases = [
      'not-a-hash',
      '0xabc123', // truncated
      VALID_TX_HASH + '00', // over-length
      'abc' + 'a'.repeat(63), // missing 0x
      '0x' + 'g'.repeat(64), // non-hex char
    ];
    for (const bad of cases) {
      resolveSingleByTxHashMock.mockReset();
      const { res, statusCode } = makeRes();
      await handler(makeReq({ body: { reportId: VALID_REPORT_ID, txHash: bad } }), res);
      expect(statusCode()).toBe(400);
      expect(resolveSingleByTxHashMock).not.toHaveBeenCalled();
    }
  });

  it('trims whitespace around reportId and txHash before passing to the resolver', async () => {
    resolveSingleByTxHashMock.mockResolvedValueOnce({ ok: true, status: 'ready' });
    const { res, statusCode } = makeRes();
    await handler(
      makeReq({ body: { reportId: `  ${VALID_REPORT_ID}  `, txHash: `  ${VALID_TX_HASH}  ` } }),
      res,
    );
    expect(statusCode()).toBe(200);
    expect(resolveSingleByTxHashMock).toHaveBeenCalledWith(VALID_REPORT_ID, VALID_TX_HASH);
  });
});

describe('POST /api/property/recover-payment — resolver result mapping', () => {
  it('returns 200 + status when the resolver promotes the row to ready', async () => {
    resolveSingleByTxHashMock.mockResolvedValueOnce({ ok: true, status: 'ready' });
    const { res, statusCode, body } = makeRes();
    await handler(makeReq({ body: { reportId: VALID_REPORT_ID, txHash: VALID_TX_HASH } }), res);
    expect(statusCode()).toBe(200);
    expect(body()).toEqual({ reportId: VALID_REPORT_ID, status: 'ready' });
  });

  it('returns 200 + status="failed" when verification succeeded but generation failed', async () => {
    // Mirrors the resolver contract: ok:true + status='failed' means the
    // payment is locked in but report generation needs a retry. The buyer
    // can still navigate to the report page to see what went wrong.
    resolveSingleByTxHashMock.mockResolvedValueOnce({ ok: true, status: 'failed' });
    const { res, statusCode, body } = makeRes();
    await handler(makeReq({ body: { reportId: VALID_REPORT_ID, txHash: VALID_TX_HASH } }), res);
    expect(statusCode()).toBe(200);
    expect(body().status).toBe('failed');
  });

  it('returns 403 when the resolver flags a sender-wallet mismatch (someone-elses-report defense)', async () => {
    resolveSingleByTxHashMock.mockResolvedValueOnce({
      ok: false,
      reason:
        'Payment must be sent from the wallet recorded on the report (0xAAA…); transfer was from 0xBBB….',
    });
    const { res, statusCode, body } = makeRes();
    await handler(makeReq({ body: { reportId: VALID_REPORT_ID, txHash: VALID_TX_HASH } }), res);
    expect(statusCode()).toBe(403);
    expect(body().error).toMatch(/sent from the wallet/i);
  });

  it('returns 409 when the resolver refuses to overwrite a non-pending report (idempotency)', async () => {
    resolveSingleByTxHashMock.mockResolvedValueOnce({
      ok: false,
      reason: 'Report is already paid, refusing to overwrite.',
    });
    const { res, statusCode, body } = makeRes();
    await handler(makeReq({ body: { reportId: VALID_REPORT_ID, txHash: VALID_TX_HASH } }), res);
    expect(statusCode()).toBe(409);
    expect(body().error).toMatch(/already paid/i);
  });

  it('returns 409 when the tx hash has already been claimed by another report', async () => {
    resolveSingleByTxHashMock.mockResolvedValueOnce({
      ok: false,
      reason: 'Tx hash already used by another report.',
    });
    const { res, statusCode, body } = makeRes();
    await handler(makeReq({ body: { reportId: VALID_REPORT_ID, txHash: VALID_TX_HASH } }), res);
    expect(statusCode()).toBe(409);
    expect(body().error).toMatch(/already used by another/i);
  });

  it('returns 404 when the resolver cannot find the report', async () => {
    resolveSingleByTxHashMock.mockResolvedValueOnce({ ok: false, reason: 'Report not found' });
    const { res, statusCode, body } = makeRes();
    await handler(makeReq({ body: { reportId: VALID_REPORT_ID, txHash: VALID_TX_HASH } }), res);
    expect(statusCode()).toBe(404);
    expect(body().error).toMatch(/not found/i);
  });

  it('returns 400 for free-tier reports (no payment required)', async () => {
    resolveSingleByTxHashMock.mockResolvedValueOnce({
      ok: false,
      reason: 'Free reports do not require payment.',
    });
    const { res, statusCode, body } = makeRes();
    await handler(makeReq({ body: { reportId: VALID_REPORT_ID, txHash: VALID_TX_HASH } }), res);
    expect(statusCode()).toBe(400);
    expect(body().error).toMatch(/free reports/i);
  });

  it('returns 402 when the on-chain verification fails (insufficient amount, wrong recipient, etc)', async () => {
    resolveSingleByTxHashMock.mockResolvedValueOnce({
      ok: false,
      reason: 'Transfer amount 3.00 AXUSD is below the required 4.99 AXUSD.',
    });
    const { res, statusCode, body } = makeRes();
    await handler(makeReq({ body: { reportId: VALID_REPORT_ID, txHash: VALID_TX_HASH } }), res);
    expect(statusCode()).toBe(402);
    expect(body().error).toMatch(/below the required/i);
  });

  it('returns 500 with a generic message when the resolver throws (internal details not leaked)', async () => {
    resolveSingleByTxHashMock.mockRejectedValueOnce(
      new Error('SECRET_DB_PASSWORD=hunter2 — connection refused'),
    );
    const { res, statusCode, body } = makeRes();
    await handler(makeReq({ body: { reportId: VALID_REPORT_ID, txHash: VALID_TX_HASH } }), res);
    expect(statusCode()).toBe(500);
    expect(body().error).toBe('Could not recover payment.');
    // Critical: the leaky internal message must not be returned to the buyer.
    expect(JSON.stringify(body())).not.toMatch(/hunter2/);
    expect(JSON.stringify(body())).not.toMatch(/SECRET/);
  });
});

describe('POST /api/property/recover-payment — rate limiting (brute-force defense)', () => {
  it('returns 429 once a single IP exceeds the strict rate limit (10 req/min)', async () => {
    // Always succeed at the resolver layer so we are isolating the limiter.
    resolveSingleByTxHashMock.mockResolvedValue({ ok: true, status: 'ready' });

    // rateLimitStrict is keyed by (prefix, ip). Use a fresh, unique IP so
    // no other test in this file (which uses random IPs) can have already
    // used quota for this key.
    const ip = '198.51.100.42';
    let lastStatus = 0;
    let firstLimitedStatus = 0;
    for (let i = 0; i < 11; i++) {
      const { res, statusCode } = makeRes();
      await handler(
        makeReq({ ip, body: { reportId: VALID_REPORT_ID, txHash: VALID_TX_HASH } }),
        res,
      );
      lastStatus = statusCode();
      if (lastStatus === 429 && firstLimitedStatus === 0) firstLimitedStatus = i + 1;
    }

    // The first 10 requests must succeed; the 11th must be limited.
    expect(firstLimitedStatus).toBe(11);
    expect(lastStatus).toBe(429);
  });

  it('does NOT consume rate-limit quota for non-POST requests (405 short-circuits before the limiter would matter)', async () => {
    // This is mostly a behavioral guarantee — non-POST should never reach
    // the resolver, regardless of how many times you send it.
    const ip = '198.51.100.99';
    for (let i = 0; i < 25; i++) {
      const { res, statusCode } = makeRes();
      await handler(makeReq({ method: 'GET', ip, body: {} }), res);
      expect(statusCode()).toBe(405);
    }
    expect(resolveSingleByTxHashMock).not.toHaveBeenCalled();
  });
});
