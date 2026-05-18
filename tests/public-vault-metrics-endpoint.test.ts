/**
 * tests/public-vault-metrics-endpoint.test.ts
 *
 * Unit tests for GET /api/treasury/vault/public-metrics.
 *
 * The endpoint is the sole public, unauthenticated surface that exposes live
 * vault yield figures to the transparency page. A regression here would
 * silently surface "—" for every APY/AUM metric on /transparency with no
 * operator alert. Coverage:
 *
 *   1. GET → 200 with { success: true, data: <PublicVaultMetrics> }.
 *   2. Cache-Control: public, max-age=60, s-maxage=60 is set on success.
 *   3. aaveApyPct / blendedApyPct are null when the upstream value is null.
 *   4. POST / PUT / PATCH / DELETE → 405 Method Not Allowed.
 *   5. getVaultSummary throwing → 500 with a generic message (raw error NOT leaked).
 *   6. Rate limiter triggered → handler exits early, getVaultSummary NOT called.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

// ── Mock dependencies before importing the handler ───────────────────────────

const mockGetVaultSummary = vi.fn();

vi.mock('../lib/treasury/vault/vaultService', () => ({
  getVaultSummary: (...args: unknown[]) => mockGetVaultSummary(...args),
}));

const mockRateLimitDefault = vi.fn();

vi.mock('../lib/rateLimit', () => ({
  rateLimitDefault: (...args: unknown[]) => mockRateLimitDefault(...args),
}));

// Import handler AFTER mocks are registered
const { default: handler } = await import(
  '../pages/api/treasury/vault/public-metrics'
);

// ── Request / response factory helpers ───────────────────────────────────────

type ReqOpts = {
  method?: string;
  socket?: { remoteAddress?: string };
};

function makeReq(opts: ReqOpts = {}): NextApiRequest {
  return {
    method: opts.method ?? 'GET',
    headers: {},
    query: {},
    socket: opts.socket ?? { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest;
}

interface MockResResult {
  res: NextApiResponse;
  statusCode(): number;
  body(): unknown;
  headers(): Record<string, string>;
}

function makeRes(): MockResResult {
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
    end() {
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

// ── Shared fixture ────────────────────────────────────────────────────────────

const MOCK_SUMMARY = {
  aumUsdc: 125_000,
  idleUsdc: 25_000,
  deployedUsdc: 100_000,
  blendedApyEstimatePct: 4.72,
  lastUpdated: '2026-05-18T12:00:00.000Z',
  aavePosition: {
    address: '0xabc',
    name: 'Aave v3 USDC',
    apyEstimatePct: 4.85,
    currentValueUsdc: 100_000,
    principalUsdc: 98_000,
    unrealizedYieldUsdc: 2_000,
    allocationPct: 80,
    lastRebalancedAt: null,
  },
  camelotPosition: {
    address: '0xdef',
    name: 'Camelot AXUSD/USDC',
    apyEstimatePct: 3.1,
    currentValueUsdc: 25_000,
    principalUsdc: 24_500,
    unrealizedYieldUsdc: 500,
    allocationPct: 20,
    lastRebalancedAt: null,
  },
  // remaining VaultSummary fields not used by public-metrics
  axusdIdleUsdc: 0,
  axusdDeployedUsdc: 0,
  yieldHarvestedInceptionUsdc: 0,
  lastHarvestedAt: null,
  paused: false,
  isLive: true,
  minHarvestThresholdUsdc: 1,
  cronRunHistory: [],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/treasury/vault/public-metrics', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default: rate limiter passes
    mockRateLimitDefault.mockReturnValue(true);
    // Default: getVaultSummary returns a healthy summary
    mockGetVaultSummary.mockResolvedValue(MOCK_SUMMARY);
  });

  it('returns 200 with success:true and the expected data shape', async () => {
    const { res, statusCode, body } = makeRes();
    await handler(makeReq(), res);

    expect(statusCode()).toBe(200);
    const parsed = body() as { success: true; data: Record<string, unknown> };
    expect(parsed.success).toBe(true);

    const data = parsed.data;
    expect(typeof data.aumUsdc).toBe('number');
    expect(typeof data.idleUsdc).toBe('number');
    expect(typeof data.deployedUsdc).toBe('number');
    expect(typeof data.aaveApyPct).toBe('number');
    expect(typeof data.blendedApyPct).toBe('number');
    expect(typeof data.lastUpdated).toBe('string');
  });

  it('returns values sourced from getVaultSummary correctly', async () => {
    const { res, body } = makeRes();
    await handler(makeReq(), res);

    const { data } = body() as { data: Record<string, unknown> };
    expect(data.aumUsdc).toBe(125_000);
    expect(data.idleUsdc).toBe(25_000);
    expect(data.deployedUsdc).toBe(100_000);
    expect(data.aaveApyPct).toBe(4.85);
    expect(data.blendedApyPct).toBe(4.72);
    expect(data.lastUpdated).toBe('2026-05-18T12:00:00.000Z');
  });

  it('sets Cache-Control: public, max-age=60, s-maxage=60 on success', async () => {
    const { res, headers } = makeRes();
    await handler(makeReq(), res);

    expect(headers()['cache-control']).toBe('public, max-age=60, s-maxage=60');
  });

  it('surfaces null for aaveApyPct when aavePosition.apyEstimatePct is null', async () => {
    mockGetVaultSummary.mockResolvedValue({
      ...MOCK_SUMMARY,
      aavePosition: { ...MOCK_SUMMARY.aavePosition, apyEstimatePct: null },
    });

    const { res, statusCode, body } = makeRes();
    await handler(makeReq(), res);

    expect(statusCode()).toBe(200);
    const { data } = body() as { data: { aaveApyPct: null } };
    expect(data.aaveApyPct).toBeNull();
  });

  it('surfaces null for blendedApyPct when blendedApyEstimatePct is null', async () => {
    mockGetVaultSummary.mockResolvedValue({
      ...MOCK_SUMMARY,
      blendedApyEstimatePct: null,
    });

    const { res, statusCode, body } = makeRes();
    await handler(makeReq(), res);

    expect(statusCode()).toBe(200);
    const { data } = body() as { data: { blendedApyPct: null } };
    expect(data.blendedApyPct).toBeNull();
  });

  it('returns 405 for non-GET methods and does not call getVaultSummary', async () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      vi.clearAllMocks();
      mockRateLimitDefault.mockReturnValue(true);

      const { res, statusCode, body } = makeRes();
      await handler(makeReq({ method }), res);

      expect(statusCode()).toBe(405);
      const parsed = body() as { success: false; error: string };
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('Method not allowed');
      expect(mockGetVaultSummary).not.toHaveBeenCalled();
    }
  });

  it('returns 500 with a generic error when getVaultSummary throws', async () => {
    mockGetVaultSummary.mockRejectedValue(
      new Error('db connection refused: postgresql://secret@host/db'),
    );

    const { res, statusCode, body } = makeRes();
    await handler(makeReq(), res);

    expect(statusCode()).toBe(500);
    const parsed = body() as { success: false; error: string };
    expect(parsed.success).toBe(false);
    // Generic message — the raw db error must NOT be visible to the public
    expect(parsed.error).toBe('Failed to fetch public vault metrics');
    expect(parsed.error).not.toContain('postgresql');
    expect(parsed.error).not.toContain('secret');
    expect(parsed.error).not.toContain('db connection refused');
  });

  it('does not leak internal error messages in the 500 response body', async () => {
    mockGetVaultSummary.mockRejectedValue(
      new Error('ADMIN_KEY=supersecret internal trace'),
    );

    const { res, body } = makeRes();
    await handler(makeReq(), res);

    const raw = JSON.stringify(body());
    expect(raw).not.toContain('ADMIN_KEY');
    expect(raw).not.toContain('supersecret');
    expect(raw).not.toContain('internal trace');
  });

  it('exits early when the rate limiter returns false and does not call getVaultSummary', async () => {
    // Simulate rate-limiter writing the 429 and returning false (same as production)
    mockRateLimitDefault.mockImplementation(
      (_req: NextApiRequest, res: NextApiResponse) => {
        (res as unknown as { status: (c: number) => { json: (d: unknown) => void } })
          .status(429)
          .json({ error: 'Too many requests. Please wait before trying again.', retryAfterSeconds: 45 });
        return false;
      },
    );

    const { res, statusCode } = makeRes();
    await handler(makeReq(), res);

    expect(statusCode()).toBe(429);
    expect(mockGetVaultSummary).not.toHaveBeenCalled();
  });

  it('calls getVaultSummary exactly once per successful request', async () => {
    const { res } = makeRes();
    await handler(makeReq(), res);
    expect(mockGetVaultSummary).toHaveBeenCalledTimes(1);
  });
});
