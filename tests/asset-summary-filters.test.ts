/**
 * tests/asset-summary-filters.test.ts
 *
 * Unit tests for GET /api/capinfra/operator/assets/summary query-param
 * validation. The handler validates `type` and `status` with zod
 * (`ZAssetType` / `ZRecordStatus`) and must return a 400 with a clear
 * error message when an invalid value is supplied. A regression in
 * that validation (silent fall-through to an unfiltered query, or a
 * 500 from a downstream layer) would be invisible without explicit
 * coverage — this file is that coverage.
 *
 * Covers:
 *  1. Invalid `type` query param → 400 + "Invalid type filter"
 *  2. Invalid `status` query param → 400 + "Invalid status filter"
 *  3. Happy path with valid `type` + `status` → 200 and the filters
 *     are forwarded to the asset-registry layer (proving the values
 *     actually narrow the query rather than being silently dropped).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

// ─── Mocks ─────────────────────────────────────────────────────────────────────
//
// The summary handler calls listAssets(), getLatestPrice(), and runs two
// drizzle queries against `db`. For these tests we only care about the
// validation branch executed *before* any of that; mocking them keeps the
// test hermetic (no DB, no real market-data lookups).

const mockListAssets = vi.fn();
const mockGetLatestPrice = vi.fn();

vi.mock('../lib/capinfra/assetRegistry', () => ({
  listAssets: (...args: unknown[]) => mockListAssets(...args),
}));

vi.mock('../lib/capinfra/marketData', () => ({
  getLatestPrice: (...args: unknown[]) => mockGetLatestPrice(...args),
}));

vi.mock('../server/db', () => {
  const chain = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: async () => [],
    then: (resolve: (v: unknown) => unknown) => resolve([{ count: 0 }]),
  };
  return { db: chain };
});

const { default: summaryHandler } = await import(
  '../pages/api/capinfra/operator/assets/summary'
);

// ─── Request / response helpers ────────────────────────────────────────────────

interface MockReqOptions {
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string | string[]>;
}

function makeReq(opts: MockReqOptions = {}): NextApiRequest {
  const { method = 'GET', headers = {}, query = {} } = opts;
  return { method, headers, query } as unknown as NextApiRequest;
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

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/capinfra/operator/assets/summary — filter validation', () => {
  const ADMIN_KEY = 'test-admin-summary-key';
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = {
      ...savedEnv,
      ADMIN_SOLVENCY_KEY: ADMIN_KEY,
    };
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  it('returns 400 with "Invalid type filter" when ?type is not a known asset type', async () => {
    const { res, statusCode, body } = makeRes();
    await summaryHandler(
      makeReq({
        headers: { 'x-admin-key': ADMIN_KEY },
        query: { type: 'NOT_REAL' },
      }),
      res,
    );
    expect(statusCode()).toBe(400);
    expect(JSON.parse(body())).toMatchObject({ error: 'Invalid type filter' });
    expect(mockListAssets).not.toHaveBeenCalled();
  });

  it('returns 400 with "Invalid status filter" when ?status is not a known record status', async () => {
    const { res, statusCode, body } = makeRes();
    await summaryHandler(
      makeReq({
        headers: { 'x-admin-key': ADMIN_KEY },
        query: { status: 'BOGUS' },
      }),
      res,
    );
    expect(statusCode()).toBe(400);
    expect(JSON.parse(body())).toMatchObject({ error: 'Invalid status filter' });
    expect(mockListAssets).not.toHaveBeenCalled();
  });

  it('forwards valid type and status filters to listAssets and returns the narrowed items', async () => {
    const filteredAsset = {
      id: 'ast_test_axau',
      symbol: 'AXAU',
      displayName: 'Axiom Gold',
      assetType: 'PHYSICAL_METAL',
      status: 'ACTIVE',
    };
    const spotPrice = {
      price: '2412.55',
      source: 'lbma',
      observedAt: '2026-04-20T14:30:00.000Z',
      isStale: false,
    };
    mockListAssets.mockResolvedValue([filteredAsset]);
    mockGetLatestPrice.mockResolvedValue(spotPrice);

    const { res, statusCode, body } = makeRes();
    await summaryHandler(
      makeReq({
        headers: { 'x-admin-key': ADMIN_KEY },
        query: { type: 'PHYSICAL_METAL', status: 'ACTIVE' },
      }),
      res,
    );

    expect(statusCode()).toBe(200);
    expect(mockListAssets).toHaveBeenCalledTimes(1);
    expect(mockListAssets).toHaveBeenCalledWith({
      type: 'PHYSICAL_METAL',
      status: 'ACTIVE',
    });
    // Spot lookup happens once per asset returned by listAssets.
    expect(mockGetLatestPrice).toHaveBeenCalledTimes(1);
    expect(mockGetLatestPrice).toHaveBeenCalledWith(filteredAsset.id, 'SPOT');

    const parsed = JSON.parse(body());
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]).toMatchObject({
      asset: { id: filteredAsset.id, symbol: 'AXAU', assetType: 'PHYSICAL_METAL' },
      latestSpot: { price: '2412.55', source: 'lbma' },
      latestReserve: null,
      auditEventCount: 0,
    });
  });

  it('omits both filters from the listAssets call when neither is provided', async () => {
    mockListAssets.mockResolvedValue([]);
    const { res, statusCode } = makeRes();
    await summaryHandler(
      makeReq({ headers: { 'x-admin-key': ADMIN_KEY } }),
      res,
    );
    expect(statusCode()).toBe(200);
    expect(mockListAssets).toHaveBeenCalledTimes(1);
    expect(mockListAssets).toHaveBeenCalledWith({});
  });
});
