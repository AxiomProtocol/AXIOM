/**
 * tests/nft-eligibility-endpoint.test.ts
 *
 * API-level unit tests for GET /api/nft/eligibility.
 *
 * Coverage:
 *  1. Missing / invalid wallet address → 400.
 *  2. Valid wallet, no DB record → eligible: false, minted: false.
 *  3. Valid wallet, DB record found → eligible/minted values surfaced.
 *  4. ?all=true → returns founder + 6 participation types + contract addresses.
 *  5. ?all=true, no DB records → all types default to ineligible/unminted.
 *  6. POST with valid admin key → upserts eligibility and returns record.
 *  7. POST without admin key → 403.
 *
 * lib/nft/db is mocked so the tests run without a live database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

// ── Mock lib/nft/db before importing the handler ──────────────────────────────
const mockEnsureNFTTables = vi.fn().mockResolvedValue(undefined);
const mockGetEligibility  = vi.fn();
const mockUpsertEligibility = vi.fn();

vi.mock('../lib/nft/db', () => ({
  ensureNFTTables: (...a: unknown[]) => mockEnsureNFTTables(...a),
  getEligibility:  (...a: unknown[]) => mockGetEligibility(...a),
  upsertEligibility: (...a: unknown[]) => mockUpsertEligibility(...a),
}));

// Import handler AFTER mocks are wired
const { default: handler } = await import('../pages/api/nft/eligibility');

// ── Request / response factory helpers ───────────────────────────────────────
type ReqOpts = {
  method?: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
};

function makeReq(opts: ReqOpts = {}): NextApiRequest {
  return {
    method:  opts.method ?? 'GET',
    query:   opts.query  ?? {},
    body:    opts.body   ?? {},
    headers: opts.headers ?? {},
  } as unknown as NextApiRequest;
}

function makeRes() {
  let statusCode = 200;
  let body: unknown;
  const res = {
    status(code: number) { statusCode = code; return res; },
    json(data: unknown)  { body = data; return res; },
    get statusCode() { return statusCode; },
    get body()       { return body; },
  };
  return res as unknown as NextApiResponse & { statusCode: number; body: unknown };
}

const VALID_WALLET = '0xAbCd1234567890123456789012345678AbCd1234';

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('GET /api/nft/eligibility', () => {
  beforeEach(() => {
    mockGetEligibility.mockReset();
    mockEnsureNFTTables.mockResolvedValue(undefined);
  });

  it('returns 400 for missing wallet param', async () => {
    const req = makeReq({ query: {} });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect((res.body as { error: string }).error).toMatch(/invalid wallet/i);
  });

  it('returns 400 for malformed wallet address', async () => {
    const req = makeReq({ query: { wallet: 'not-an-address' } });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('returns eligible:false minted:false when wallet has no DB record', async () => {
    mockGetEligibility.mockResolvedValue(null);
    const req = makeReq({ query: { wallet: VALID_WALLET } });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const b = res.body as Record<string, unknown>;
    expect(b.eligible).toBe(false);
    expect(b.minted).toBe(false);
    // The single-collection mode returns the address as-is from the query param;
    // compare case-insensitively to stay robust to future normalization changes.
    expect(b.walletAddress.toLowerCase()).toBe(VALID_WALLET.toLowerCase());
  });

  it('surfaces eligible:true minted:false from DB record', async () => {
    mockGetEligibility.mockResolvedValue({
      eligible: true, minted: false,
      minted_token_id: null, minted_tx_hash: null, reason: null,
    });
    const req = makeReq({ query: { wallet: VALID_WALLET, collection: 'founder' } });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const b = res.body as Record<string, unknown>;
    expect(b.eligible).toBe(true);
    expect(b.minted).toBe(false);
  });

  it('surfaces minted:true and mintedTokenId from a minted DB record', async () => {
    mockGetEligibility.mockResolvedValue({
      eligible: true, minted: true,
      minted_token_id: 7, minted_tx_hash: `0x${'cc'.repeat(32)}`, reason: null,
    });
    const req = makeReq({ query: { wallet: VALID_WALLET } });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const b = res.body as Record<string, unknown>;
    expect(b.minted).toBe(true);
    expect(b.mintedTokenId).toBe(7);
    expect(typeof b.mintedTxHash).toBe('string');
  });

  it('returns 405 for unsupported method', async () => {
    const req = makeReq({ method: 'PUT', query: { wallet: VALID_WALLET } });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });
});

describe('GET /api/nft/eligibility?all=true — bulk mode', () => {
  beforeEach(() => {
    // Return null for all 7 parallel getEligibility calls by default
    mockGetEligibility.mockResolvedValue(null);
    mockEnsureNFTTables.mockResolvedValue(undefined);
  });

  it('returns response shape with founder + 6 participation types', async () => {
    const req = makeReq({ query: { wallet: VALID_WALLET, all: 'true' } });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const b = res.body as {
      walletAddress: string;
      founder: { eligible: boolean; minted: boolean };
      participation: { tokenId: number; eligible: boolean; minted: boolean }[];
    };
    expect(b.walletAddress).toBe(VALID_WALLET.toLowerCase());
    expect(typeof b.founder).toBe('object');
    expect(Array.isArray(b.participation)).toBe(true);
    expect(b.participation).toHaveLength(6);
    expect(b.participation.map(p => p.tokenId)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('defaults all types to ineligible/unminted when no DB records exist', async () => {
    mockGetEligibility.mockResolvedValue(null);
    const req = makeReq({ query: { wallet: VALID_WALLET, all: 'true' } });
    const res = makeRes();
    await handler(req, res);
    const b = res.body as {
      founder: { eligible: boolean; minted: boolean };
      participation: { eligible: boolean; minted: boolean }[];
    };
    expect(b.founder.eligible).toBe(false);
    expect(b.founder.minted).toBe(false);
    expect(b.participation.every(p => !p.eligible && !p.minted)).toBe(true);
  });

  it('surfaces founder eligibility when DB record is eligible', async () => {
    mockGetEligibility
      .mockResolvedValueOnce({ eligible: true, minted: false, minted_token_id: null, minted_tx_hash: null, reason: null })
      .mockResolvedValue(null); // participation slots
    const req = makeReq({ query: { wallet: VALID_WALLET, all: 'true' } });
    const res = makeRes();
    await handler(req, res);
    const b = res.body as { founder: { eligible: boolean; minted: boolean } };
    expect(b.founder.eligible).toBe(true);
    expect(b.founder.minted).toBe(false);
  });

  it('surfaces minted participation type', async () => {
    // First call = founder (null), then tokenId 1 = minted, rest = null
    mockGetEligibility
      .mockResolvedValueOnce(null) // founder
      .mockResolvedValueOnce({ eligible: true, minted: true, minted_token_id: 1, minted_tx_hash: `0x${'aa'.repeat(32)}`, reason: null })
      .mockResolvedValue(null);
    const req = makeReq({ query: { wallet: VALID_WALLET, all: 'true' } });
    const res = makeRes();
    await handler(req, res);
    const b = res.body as { participation: { tokenId: number; minted: boolean }[] };
    const type1 = b.participation.find(p => p.tokenId === 1);
    expect(type1?.minted).toBe(true);
    const type2 = b.participation.find(p => p.tokenId === 2);
    expect(type2?.minted).toBe(false);
  });

  it('includes founderContract and participationContract fields', async () => {
    const req = makeReq({ query: { wallet: VALID_WALLET, all: 'true' } });
    const res = makeRes();
    await handler(req, res);
    const b = res.body as Record<string, unknown>;
    // Fields are always present (null if env var not set in test)
    expect('founderContract' in b).toBe(true);
    expect('participationContract' in b).toBe(true);
  });
});

describe('POST /api/nft/eligibility — admin grant', () => {
  beforeEach(() => {
    mockUpsertEligibility.mockResolvedValue({ id: 1, wallet_address: VALID_WALLET.toLowerCase(), collection: 'founder', eligible: true });
    mockEnsureNFTTables.mockResolvedValue(undefined);
  });

  it('returns 403 without admin key header', async () => {
    const req = makeReq({
      method: 'POST',
      body:   { walletAddress: VALID_WALLET, collection: 'founder', eligible: true },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(403);
  });

  it('returns 400 for invalid wallet address in POST body', async () => {
    // Set env var BEFORE building the request so the header value matches
    const testKey = 'test-admin-key-eligibility-400';
    const prev = process.env.ADMIN_SOLVENCY_KEY;
    process.env.ADMIN_SOLVENCY_KEY = testKey;
    const req = makeReq({
      method:  'POST',
      headers: { 'x-admin-key': testKey },
      body:    { walletAddress: 'bad', collection: 'founder' },
    });
    const res = makeRes();
    await handler(req, res);
    process.env.ADMIN_SOLVENCY_KEY = prev;
    expect(res.statusCode).toBe(400);
  });

  it('upserts eligibility and returns 200 with valid admin key + wallet', async () => {
    const testKey = 'test-admin-key-nft-eligibility';
    const prev = process.env.ADMIN_SOLVENCY_KEY;
    process.env.ADMIN_SOLVENCY_KEY = testKey;
    const req = makeReq({
      method:  'POST',
      headers: { 'x-admin-key': testKey },
      body:    { walletAddress: VALID_WALLET, collection: 'founder', eligible: true },
    });
    const res = makeRes();
    await handler(req, res);
    process.env.ADMIN_SOLVENCY_KEY = prev;
    expect(res.statusCode).toBe(200);
    const b = res.body as { success: boolean };
    expect(b.success).toBe(true);
    expect(mockUpsertEligibility).toHaveBeenCalledOnce();
    expect(mockUpsertEligibility).toHaveBeenCalledWith(
      expect.objectContaining({ walletAddress: VALID_WALLET, collection: 'founder', eligible: true })
    );
  });
});
