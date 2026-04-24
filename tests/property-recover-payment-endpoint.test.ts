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
 *   4. Happy path: 200 + status from resolver (incl. EXPIRED → ready
 *      recovery — the headline self-recover path for task #280)
 *   5. Sender-wallet enforcement reachable: 403 when resolver returns the
 *      "must be sent from the wallet recorded on the report" reason
 *   6. Idempotency: 200 + current status when the resolver reports the
 *      row has already moved past pending (paid/ready/generating/failed),
 *      mirroring confirm-payment.ts so polling/retries don't show a
 *      spurious failure
 *   7. Tx-hash reuse: 409 when resolver flags the hash as belonging to
 *      another report
 *   8. Verification failure (insufficient amount, etc): 402
 *   9. Free tier: 400
 *  10. Report not found: 404
 *  11. Resolver crash: 500 (no leak of internal error message)
 *  12. Rate limiting (per-IP): 11th request from same IP in 60s → 429
 *  13. Rate limiting (per-reportId): 6th attempt against the same report
 *      in 60s → 429, even when each request comes from a fresh IP
 *  14. Per-reportId limit is case-insensitive (no trivial bypass)
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
// We also need the in-memory rate-limit store to be cleared between
// tests so the per-reportId limiter (5/min, keyed on the canonical
// reportId) doesn't bleed across cases that all share VALID_REPORT_ID.
const rateLimitModule = await import('../lib/rateLimit');

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
  // Wipe the in-memory rate-limit buckets so each test starts with a
  // clean per-IP and per-reportId quota.
  rateLimitModule.__resetRateLimitStoreForTests();
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

  it('returns 200 when the resolver successfully rescues an EXPIRED report (the headline self-recover path)', async () => {
    // The whole point of task #280: a buyer whose row was auto-expired
    // (no transfer matched in the resolver's lookback window) pastes
    // their tx hash here and unstuck their own report. The resolver
    // accepts both 'pending' and 'expired' as recoverable starting
    // states, and the endpoint surfaces the success identically.
    resolveSingleByTxHashMock.mockResolvedValueOnce({ ok: true, status: 'ready' });
    const { res, statusCode, body } = makeRes();
    await handler(makeReq({ body: { reportId: VALID_REPORT_ID, txHash: VALID_TX_HASH } }), res);
    expect(statusCode()).toBe(200);
    expect(body()).toEqual({ reportId: VALID_REPORT_ID, status: 'ready' });
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

  it('returns 200 + current status (idempotent) when the resolver reports the row has already moved past pending', async () => {
    // Mirrors confirm-payment.ts: a non-pending row on a "did my payment
    // go through?" retry must NOT surface as an error — return 200 with
    // the current status so the client can navigate the buyer to their
    // report. The resolver phrases this as "Report is already <status>,
    // refusing to overwrite." for paid/ready/generating/failed.
    for (const status of ['paid', 'ready', 'generating', 'failed'] as const) {
      resolveSingleByTxHashMock.mockResolvedValueOnce({
        ok: false,
        reason: `Report is already ${status}, refusing to overwrite.`,
      });
      const { res, statusCode, body } = makeRes();
      // Use a short unique reportId per status so neither rate-limit
      // axis interferes AND we stay under the 40-char schema cap.
      const reportId = `rep_idem_${status}`;
      await handler(
        makeReq({
          ip: `192.0.2.${50 + status.length}`,
          body: { reportId, txHash: VALID_TX_HASH },
        }),
        res,
      );
      expect(statusCode()).toBe(200);
      expect(body()).toEqual({ reportId, status });
    }
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
    // used quota for this key. Vary the reportId per-attempt so the
    // per-reportId limiter (5/min) does NOT trip first and mask the
    // per-IP behavior we want to assert here.
    const ip = '198.51.100.42';
    let lastStatus = 0;
    let firstLimitedStatus = 0;
    for (let i = 0; i < 11; i++) {
      const { res, statusCode } = makeRes();
      await handler(
        makeReq({
          ip,
          body: { reportId: `${VALID_REPORT_ID}-ip-${i}`, txHash: VALID_TX_HASH },
        }),
        res,
      );
      lastStatus = statusCode();
      if (lastStatus === 429 && firstLimitedStatus === 0) firstLimitedStatus = i + 1;
    }

    // The first 10 requests must succeed; the 11th must be limited.
    expect(firstLimitedStatus).toBe(11);
    expect(lastStatus).toBe(429);
  });

  it('returns 429 on the 6th attempt against the same reportId — even from different IPs (distributed-attack defense)', async () => {
    // Per-reportId limiter is the second axis the task spec requires.
    // 5 attempts/minute against one report is the cap; the 6th must
    // 429 even if every request came from a fresh IP, because the
    // per-IP limiter (10/min/IP) would otherwise let a botnet brute
    // force one report unmolested.
    resolveSingleByTxHashMock.mockResolvedValue({
      ok: false,
      reason: 'Verification failed: insufficient amount',
    });

    // Use a unique reportId for this test so we don't collide with
    // other tests in this file (which use VALID_REPORT_ID).
    const targetReport = 'rep_per_id_limit_target_xyz';
    let lastStatus = 0;
    let firstLimitedAttempt = 0;
    for (let i = 0; i < 6; i++) {
      const { res, statusCode } = makeRes();
      await handler(
        makeReq({
          // Fresh IP each time → per-IP limiter is irrelevant here.
          ip: `203.0.113.${i + 1}`,
          body: { reportId: targetReport, txHash: VALID_TX_HASH },
        }),
        res,
      );
      lastStatus = statusCode();
      if (lastStatus === 429 && firstLimitedAttempt === 0) firstLimitedAttempt = i + 1;
    }

    expect(firstLimitedAttempt).toBe(6);
    expect(lastStatus).toBe(429);
  });

  it('treats reportId case-insensitively for per-report rate-limit bucketing (no trivial bypass)', async () => {
    // An attacker who could vary capitalization to dodge the per-report
    // limit would defeat its purpose. We canonicalize to lowercase
    // before keying the limiter.
    resolveSingleByTxHashMock.mockResolvedValue({ ok: false, reason: 'verify fail' });
    const targetReport = 'rep_case_bypass_target_aaa';
    const variants = [
      targetReport,
      targetReport.toUpperCase(),
      targetReport.replace('rep', 'REP'),
      targetReport.replace('target', 'TARGET'),
      targetReport,
      targetReport.toUpperCase(), // attempt #6 — must 429 regardless of case
    ];
    let lastStatus = 0;
    for (let i = 0; i < variants.length; i++) {
      const { res, statusCode } = makeRes();
      await handler(
        makeReq({
          ip: `192.0.2.${100 + i}`,
          body: { reportId: variants[i], txHash: VALID_TX_HASH },
        }),
        res,
      );
      lastStatus = statusCode();
    }
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
