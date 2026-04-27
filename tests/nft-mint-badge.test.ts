/**
 * tests/nft-mint-badge.test.ts
 *
 * API-level unit tests for POST /api/nft/mint-badge.
 *
 * Coverage:
 *  1. Missing wallet address → 400.
 *  2. Malformed wallet address → 400.
 *  3. Missing signature / timestamp → 400.
 *  4. Expired timestamp (older than 5 min) → 400.
 *  5. Signature from a different wallet than walletAddress → 401.
 *  6. Invalid (garbage) signature → 401.
 *  7. Wallet not eligible → 403.
 *  8. Wallet already minted → 409.
 *
 * Real ethers.verifyMessage is used for signature tests — this validates
 * the handler's signature-check logic without mocking the crypto path.
 * lib/nft/db is mocked so no live DB is required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ethers }                                 from 'ethers';
import type { NextApiRequest, NextApiResponse }   from 'next';

// ── Known test wallet (private key is not a real secret) ─────────────────────
const TEST_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const testWallet       = new ethers.Wallet(TEST_PRIVATE_KEY);
const TEST_WALLET_ADDR = testWallet.address; // 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

// ── lib/nft/db mocks ──────────────────────────────────────────────────────────
const mockEnsureNFTTables = vi.fn().mockResolvedValue(undefined);
const mockGetEligibility  = vi.fn();
const mockUpsertNFTToken  = vi.fn().mockResolvedValue({});
const mockUpsertElig      = vi.fn().mockResolvedValue({});

vi.mock('../lib/nft/db', () => ({
  ensureNFTTables: (...a: unknown[]) => mockEnsureNFTTables(...a),
  getEligibility:  (...a: unknown[]) => mockGetEligibility(...a),
  upsertNFTToken:  (...a: unknown[]) => mockUpsertNFTToken(...a),
  upsertEligibility: (...a: unknown[]) => mockUpsertElig(...a),
}));

// ── Silence traitEngine and mediaPipeline (not under test here) ───────────────
vi.mock('../lib/nft/traitEngine', () => ({
  computeSeed:   () => `0x${'ab'.repeat(32)}`,
  computeTraits: () => ({ rarityTier: 'Rare', rarityByte: 100 }),
}));

vi.mock('../lib/nft/mediaPipeline', () => ({
  generateNFTMedia: vi.fn().mockResolvedValue(undefined),
}));

const { default: handler } = await import('../pages/api/nft/mint-badge');

// ── Request / response helpers ────────────────────────────────────────────────
type ReqOpts = {
  method?: string;
  body?: Record<string, unknown>;
};
function makeReq(opts: ReqOpts = {}): NextApiRequest {
  return {
    method: opts.method ?? 'POST',
    body:   opts.body   ?? {},
    headers: {},
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

/** Build a valid sign message and return { message, signature, timestamp }. */
async function buildValidSignature(walletAddr: string, wallet = testWallet) {
  const timestamp = Date.now();
  const message   = `Axiom NFT Mint Authorization\nCollection: founder\nWallet: ${walletAddr.toLowerCase()}\nTimestamp: ${timestamp}`;
  const signature = await wallet.signMessage(message);
  return { message, signature, timestamp };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('POST /api/nft/mint-badge — request validation', () => {
  beforeEach(() => {
    mockGetEligibility.mockReset();
    mockEnsureNFTTables.mockResolvedValue(undefined);
  });

  it('returns 405 for non-POST methods', async () => {
    const req = makeReq({ method: 'GET' });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('returns 400 for missing wallet address', async () => {
    const req = makeReq({ body: { signature: '0xsig', timestamp: Date.now() } });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect((res.body as { error: string }).error).toMatch(/invalid wallet/i);
  });

  it('returns 400 for malformed wallet address', async () => {
    const req = makeReq({
      body: { walletAddress: 'not-hex', signature: '0xsig', timestamp: Date.now() },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when signature is missing', async () => {
    const req = makeReq({ body: { walletAddress: TEST_WALLET_ADDR, timestamp: Date.now() } });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect((res.body as { error: string }).error).toMatch(/missing signature/i);
  });

  it('returns 400 when timestamp is missing', async () => {
    const req = makeReq({ body: { walletAddress: TEST_WALLET_ADDR, signature: '0xsig' } });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for expired timestamp (> 5 min ago)', async () => {
    const expiredTs = Date.now() - 6 * 60 * 1000; // 6 minutes ago
    const req = makeReq({
      body: {
        walletAddress: TEST_WALLET_ADDR,
        signature:     '0xdeadbeef',
        timestamp:     expiredTs,
      },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect((res.body as { error: string }).error).toMatch(/expired/i);
  });
});

describe('POST /api/nft/mint-badge — signature verification', () => {
  it('returns 401 when signature is garbage (cannot be decoded)', async () => {
    const req = makeReq({
      body: {
        walletAddress: TEST_WALLET_ADDR,
        signature:     '0xinvalidsig',
        timestamp:     Date.now(),
      },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect((res.body as { error: string }).error).toMatch(/invalid signature/i);
  });

  it('returns 401 when a different wallet signed the message', async () => {
    // otherWallet signs a message claiming it is testWallet
    const otherWallet = ethers.Wallet.createRandom();
    const timestamp   = Date.now();
    // Message is built for TEST_WALLET_ADDR but signed by otherWallet
    const message     = `Axiom NFT Mint Authorization\nCollection: founder\nWallet: ${TEST_WALLET_ADDR.toLowerCase()}\nTimestamp: ${timestamp}`;
    const signature   = await otherWallet.signMessage(message);

    const req = makeReq({
      body: { walletAddress: TEST_WALLET_ADDR, signature, timestamp },
    });
    const res = makeRes();
    await handler(req, res);
    // The handler recovers otherWallet.address but expects TEST_WALLET_ADDR
    expect(res.statusCode).toBe(401);
    expect((res.body as { error: string }).error).toMatch(/signer does not match/i);
  });
});

describe('POST /api/nft/mint-badge — eligibility gating', () => {
  beforeEach(() => {
    mockEnsureNFTTables.mockResolvedValue(undefined);
    mockGetEligibility.mockReset();
    // Set up env vars so the handler gets past the "contract not configured" check
    process.env.NFT_CONTRACT_FOUNDER = '0x4A651D30097E2b7326A83CbB32c02913dB8b3572';
    process.env.DEPLOYER_PRIVATE_KEY = TEST_PRIVATE_KEY; // reuse test key for deployer
  });

  it('returns 403 when wallet has no eligibility record', async () => {
    mockGetEligibility.mockResolvedValue(null);
    const { signature, timestamp } = await buildValidSignature(TEST_WALLET_ADDR);
    const req = makeReq({ body: { walletAddress: TEST_WALLET_ADDR, signature, timestamp } });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(403);
    expect((res.body as { error: string }).error).toMatch(/not on the Founder Badge eligibility/i);
  });

  it('returns 403 when wallet is explicitly marked ineligible', async () => {
    mockGetEligibility.mockResolvedValue({ eligible: false, minted: false });
    const { signature, timestamp } = await buildValidSignature(TEST_WALLET_ADDR);
    const req = makeReq({ body: { walletAddress: TEST_WALLET_ADDR, signature, timestamp } });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(403);
  });

  it('returns 409 when wallet has already minted', async () => {
    mockGetEligibility.mockResolvedValue({ eligible: true, minted: true });
    const { signature, timestamp } = await buildValidSignature(TEST_WALLET_ADDR);
    const req = makeReq({ body: { walletAddress: TEST_WALLET_ADDR, signature, timestamp } });
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(409);
    expect((res.body as { error: string }).error).toMatch(/already minted/i);
  });
});
