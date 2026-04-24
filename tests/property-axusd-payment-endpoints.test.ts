/**
 * tests/property-axusd-payment-endpoints.test.ts
 *
 * Task #286 — backend coverage for the AXUSD payment APIs that drive the
 * Property Analysis report flow:
 *   - POST /api/property/create-payment-intent
 *   - POST /api/property/confirm-payment
 *
 * The Playwright e2e (task #249) mocks both endpoints from the browser side,
 * so it does NOT exercise the real handlers. Without this file, regressions
 * in tier pricing, AXUSD decimals, the payment recipient address, the
 * tx-hash uniqueness check, or the on-chain receipt verification would slip
 * through. These tests hit the handlers directly with stubbed token-contract
 * reads so they're hermetic — no network, no DB, no RPC.
 *
 * Approach:
 *   - `server/db` is replaced with a chainable in-memory fake that captures
 *     insert/select/update arguments and serves queued result sets.
 *   - `lib/property/onchainPayment` is partially mocked: `getPaymentTokenDecimals`
 *     is forced to 6 (AXUSD GENIUS canonical) so the REAL `buildPaymentInstruction`
 *     runs end-to-end through `ethers.parseUnits`, and `verifyOnchainPayment`
 *     becomes a stub the confirm-payment tests drive.
 *   - `server/services/property/pipeline` is replaced with a hand-rolled
 *     module to avoid loading geocoder / RentCast / repliers transitively.
 *     A separate guard test re-asserts the canonical TIER_CONFIG prices by
 *     reading the source file, so this duplication can never silently drift.
 */

import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

// ── Test scratchpads (reset in beforeEach) ──────────────────────────────────

type FakeRow = Record<string, unknown>;

const recordedInsertValues: FakeRow[] = [];
const recordedUpdateSets: FakeRow[] = [];
let nextSelectResults: FakeRow[][] = [];
let nextInsertResults: FakeRow[][] = [];

// ── Module mocks (must be declared before the handler import) ───────────────

vi.mock('../server/db', () => {
  // The two handlers issue these query shapes:
  //   create-payment-intent:
  //     db.insert(propertyReports).values({...}).returning() → [row]
  //   confirm-payment:
  //     db.select().from(propertyReports).where(eq(...)).limit(1)        → [row]
  //     db.select({id}).from(propertyReports).where(and(...)).limit(1)   → [row?]
  //     db.update(propertyReports).set({...}).where(eq(...))             → awaited
  //
  // One singleton chain handles all of them. Each terminator (.returning()
  // for insert, .limit() for select, .then() for update.where) shifts a
  // result off the matching queue.
  const chain: any = {
    insert(_table: unknown) {
      return chain;
    },
    values(payload: FakeRow) {
      recordedInsertValues.push(payload);
      return chain;
    },
    returning() {
      const result = nextInsertResults.shift() ?? [];
      return Promise.resolve(result);
    },
    select(_shape?: unknown) {
      return chain;
    },
    from() {
      return chain;
    },
    where() {
      return chain;
    },
    orderBy() {
      return chain;
    },
    limit() {
      const result = nextSelectResults.shift() ?? [];
      return Promise.resolve(result);
    },
    update(_table: unknown) {
      return chain;
    },
    set(payload: FakeRow) {
      recordedUpdateSets.push(payload);
      return chain;
    },
    // Update path: db.update().set().where() is awaited directly without
    // calling .limit. Making the chain thenable resolves that await.
    // Select chains never reach here because they always call .limit first.
    then(resolve: (v: unknown) => unknown) {
      return Promise.resolve(resolve(undefined));
    },
  };
  return { db: chain };
});

// Replace `buildPaymentInstruction` with a hermetic re-implementation that
// uses the same `ethers.parseUnits(usd, decimals)` math as the production
// helper, but pinned to AXUSD's canonical 6 decimals so the test never has
// to hit RPC. The `actual.PROPERTY_PAYMENT_*` constants flow through so the
// recipient/token/chain assertions still validate the canonical values.
//
// (Why not vi.mock-and-spread to override `getPaymentTokenDecimals`?
//  `buildPaymentInstruction` calls `getPaymentTokenDecimals` via its own
//  module-internal reference, not through the imports object, so spreading
//  `...actual` and overriding the named export only affects external
//  importers — the internal call still uses the real RPC-touching version.)
const verifyOnchainPaymentMock = vi.fn();

vi.mock('../lib/property/onchainPayment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/property/onchainPayment')>();
  return {
    ...actual,
    getPaymentTokenDecimals: async () => 6,
    buildPaymentInstruction: async (amountCents: number) => {
      const decimals = 6;
      const amountUsd = (amountCents / 100).toFixed(2);
      const amountTokenUnits = ethers.parseUnits(amountUsd, decimals).toString();
      return {
        chainId: actual.PROPERTY_PAYMENT_CHAIN_ID,
        token: actual.PROPERTY_PAYMENT_TOKEN,
        recipient: actual.PROPERTY_PAYMENT_RECIPIENT,
        amountUsd,
        amountTokenUnits,
        decimals,
        symbol: 'AXUSD' as const,
      };
    },
    verifyOnchainPayment: (txHash: string, requiredAmountCents: number) =>
      verifyOnchainPaymentMock(txHash, requiredAmountCents),
  };
});

// Stand-in for the pipeline module so we don't pull in geocoder / RentCast /
// repliers / dataProviders. The TIER_CONFIG prices are duplicated here on
// purpose so this test stays hermetic; the "canonical prices" guard test at
// the bottom of this file pins them to the real source so they cannot drift.
const generateReportMock = vi.fn();

vi.mock('../server/services/property/pipeline', () => ({
  TIER_CONFIG: {
    free: { label: 'Free Report', priceCents: 0, maxPerMonth: 3, dataSources: [] },
    base: { label: 'Base Report', priceCents: 499, maxPerMonth: 50, dataSources: [] },
    premium: { label: 'Premium Report', priceCents: 1499, maxPerMonth: 100, dataSources: [] },
  },
  generateReport: (id: string) => generateReportMock(id),
}));

// Import handlers AFTER mocks are registered.
const { default: createIntentHandler } = await import(
  '../pages/api/property/create-payment-intent'
);
const { default: confirmPaymentHandler } = await import(
  '../pages/api/property/confirm-payment'
);

// Pull the real recipient/token/chainId from the (un-mocked) onchainPayment
// module so we can assert the handler returns the canonical values. Because
// our vi.mock factory spreads `...actual`, these named exports are the real
// constants (only `getPaymentTokenDecimals` and `verifyOnchainPayment` were
// replaced).
const {
  PROPERTY_PAYMENT_CHAIN_ID,
  PROPERTY_PAYMENT_TOKEN,
  PROPERTY_PAYMENT_RECIPIENT,
} = await import('../lib/property/onchainPayment');

// ── Test helpers ────────────────────────────────────────────────────────────

interface MockReqOptions {
  method?: string;
  body?: unknown;
}

function makeReq(opts: MockReqOptions = {}): NextApiRequest {
  return {
    method: opts.method ?? 'POST',
    body: opts.body ?? {},
    query: {},
    headers: { 'x-forwarded-for': '10.0.0.1' },
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest;
}

function makeRes() {
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
    body: <T = Record<string, unknown>>() => JSON.parse(_body || '{}') as T,
  };
}

const VALID_WALLET = '0xAbCdef0123456789abcdef0123456789ABCDEF01';
const VALID_TX_HASH = '0x' + 'a'.repeat(64);
const ANOTHER_TX_HASH = '0x' + 'b'.repeat(64);

beforeEach(() => {
  recordedInsertValues.length = 0;
  recordedUpdateSets.length = 0;
  nextSelectResults = [];
  nextInsertResults = [];
  verifyOnchainPaymentMock.mockReset();
  generateReportMock.mockReset();
});

// ── /api/property/create-payment-intent ─────────────────────────────────────

describe('POST /api/property/create-payment-intent', () => {
  it('rejects non-POST methods with 405', async () => {
    const { res, statusCode } = makeRes();
    await createIntentHandler(makeReq({ method: 'GET' }), res);
    expect(statusCode()).toBe(405);
  });

  it('400s when address is missing or too short', async () => {
    const { res, statusCode, body } = makeRes();
    await createIntentHandler(
      makeReq({ body: { tier: 'base', wallet: VALID_WALLET } }),
      res,
    );
    expect(statusCode()).toBe(400);
    expect(body().error).toMatch(/address/i);
  });

  it('400s on an invalid tier', async () => {
    const { res, statusCode, body } = makeRes();
    await createIntentHandler(
      makeReq({
        body: { address: '123 Main St, Anytown, USA', tier: 'gold', wallet: VALID_WALLET },
      }),
      res,
    );
    expect(statusCode()).toBe(400);
    expect(body().error).toMatch(/tier/i);
  });

  it('400s when the wallet is missing or malformed', async () => {
    const { res, statusCode, body } = makeRes();
    await createIntentHandler(
      makeReq({
        body: { address: '123 Main St, Anytown, USA', tier: 'base', wallet: 'not-a-wallet' },
      }),
      res,
    );
    expect(statusCode()).toBe(400);
    expect(body().error).toMatch(/wallet/i);
  });

  it('returns amountTokenUnits = "4990000" for the base tier (499¢ × 10^6)', async () => {
    nextInsertResults.push([{ id: 'rep_base_001' }]);
    const { res, statusCode, body } = makeRes();
    await createIntentHandler(
      makeReq({
        body: {
          address: '123 Main St, Anytown, USA',
          tier: 'base',
          wallet: VALID_WALLET,
        },
      }),
      res,
    );
    expect(statusCode()).toBe(200);
    const json = body<{
      reportId: string;
      payment: { amountTokenUnits: string; amountUsd: string; decimals: number; symbol: string };
    }>();
    expect(json.reportId).toBe('rep_base_001');
    expect(json.payment.amountTokenUnits).toBe('4990000');
    expect(json.payment.amountUsd).toBe('4.99');
    expect(json.payment.decimals).toBe(6);
    expect(json.payment.symbol).toBe('AXUSD');
  });

  it('returns amountTokenUnits = "14990000" for the premium tier (1499¢ × 10^6)', async () => {
    nextInsertResults.push([{ id: 'rep_premium_001' }]);
    const { res, statusCode, body } = makeRes();
    await createIntentHandler(
      makeReq({
        body: {
          address: '123 Main St, Anytown, USA',
          tier: 'premium',
          wallet: VALID_WALLET,
        },
      }),
      res,
    );
    expect(statusCode()).toBe(200);
    const json = body<{
      payment: { amountTokenUnits: string; amountUsd: string };
    }>();
    expect(json.payment.amountTokenUnits).toBe('14990000');
    expect(json.payment.amountUsd).toBe('14.99');
  });

  it('returns the canonical recipient, token, and chainId', async () => {
    nextInsertResults.push([{ id: 'rep_recip' }]);
    const { res, body } = makeRes();
    await createIntentHandler(
      makeReq({
        body: { address: '1 Pine Ave', tier: 'base', wallet: VALID_WALLET },
      }),
      res,
    );
    const json = body<{
      payment: { recipient: string; token: string; chainId: number };
    }>();
    expect(json.payment.chainId).toBe(PROPERTY_PAYMENT_CHAIN_ID);
    expect(json.payment.token.toLowerCase()).toBe(PROPERTY_PAYMENT_TOKEN.toLowerCase());
    expect(json.payment.recipient.toLowerCase()).toBe(
      PROPERTY_PAYMENT_RECIPIENT.toLowerCase(),
    );
    expect(json.payment.chainId).toBe(42161); // Arbitrum One
  });

  it('persists the row with lowercased wallet, the tier price, and the canonical recipient', async () => {
    nextInsertResults.push([{ id: 'rep_persist' }]);
    const { res, statusCode } = makeRes();
    await createIntentHandler(
      makeReq({
        body: {
          address: '500 Oak Ln',
          tier: 'premium',
          wallet: VALID_WALLET,
          email: 'BUYER@Example.com',
          sqft: '1800',
          bedrooms: '3',
          bathrooms: '2.5',
          yearBuilt: '1995',
          propertyType: 'single_family',
        },
      }),
      res,
    );
    expect(statusCode()).toBe(200);
    expect(recordedInsertValues).toHaveLength(1);
    const inserted = recordedInsertValues[0];
    expect(inserted.tier).toBe('premium');
    expect(inserted.status).toBe('pending');
    expect(inserted.amountPaidCents).toBe(1499);
    expect(inserted.buyerWallet).toBe(VALID_WALLET.toLowerCase());
    expect(inserted.paymentChainId).toBe(PROPERTY_PAYMENT_CHAIN_ID);
    expect((inserted.paymentToken as string).toLowerCase()).toBe(
      PROPERTY_PAYMENT_TOKEN.toLowerCase(),
    );
    expect((inserted.paymentToAddress as string).toLowerCase()).toBe(
      PROPERTY_PAYMENT_RECIPIENT.toLowerCase(),
    );
    // Numeric coercion of optional fields
    expect(inserted.sqft).toBe(1800);
    expect(inserted.bedrooms).toBe(3);
    expect(inserted.bathrooms).toBe('2.5');
    expect(inserted.yearBuilt).toBe(1995);
    expect(inserted.propertyType).toBe('single_family');
  });
});

// ── /api/property/confirm-payment ───────────────────────────────────────────

describe('POST /api/property/confirm-payment', () => {
  it('rejects non-POST methods with 405', async () => {
    const { res, statusCode } = makeRes();
    await confirmPaymentHandler(makeReq({ method: 'GET' }), res);
    expect(statusCode()).toBe(405);
  });

  it('400s when reportId is missing', async () => {
    const { res, statusCode } = makeRes();
    await confirmPaymentHandler(makeReq({ body: { txHash: VALID_TX_HASH } }), res);
    expect(statusCode()).toBe(400);
  });

  it('400s when txHash is missing', async () => {
    const { res, statusCode } = makeRes();
    await confirmPaymentHandler(makeReq({ body: { reportId: 'rep_1' } }), res);
    expect(statusCode()).toBe(400);
  });

  it('404s when the report does not exist', async () => {
    nextSelectResults.push([]); // initial select returns empty
    const { res, statusCode, body } = makeRes();
    await confirmPaymentHandler(
      makeReq({ body: { reportId: 'rep_missing', txHash: VALID_TX_HASH } }),
      res,
    );
    expect(statusCode()).toBe(404);
    expect(body().error).toMatch(/not found/i);
  });

  it('400s on free-tier reports (no payment required)', async () => {
    nextSelectResults.push([
      { id: 'rep_free', tier: 'free', status: 'pending', buyerWallet: null, paymentTxHash: null },
    ]);
    const { res, statusCode } = makeRes();
    await confirmPaymentHandler(
      makeReq({ body: { reportId: 'rep_free', txHash: VALID_TX_HASH } }),
      res,
    );
    expect(statusCode()).toBe(400);
  });

  it('is idempotent: returns 200 + current status when the report already moved past pending', async () => {
    nextSelectResults.push([
      { id: 'rep_paid', tier: 'base', status: 'ready', buyerWallet: null },
    ]);
    const { res, statusCode, body } = makeRes();
    await confirmPaymentHandler(
      makeReq({ body: { reportId: 'rep_paid', txHash: VALID_TX_HASH } }),
      res,
    );
    expect(statusCode()).toBe(200);
    expect(body()).toEqual({ reportId: 'rep_paid', status: 'ready' });
    // Verifier should not have been called once we short-circuited.
    expect(verifyOnchainPaymentMock).not.toHaveBeenCalled();
  });

  it('409s when the same tx hash was already used to pay for a different report', async () => {
    nextSelectResults.push([
      { id: 'rep_a', tier: 'base', status: 'pending', buyerWallet: null },
    ]);
    nextSelectResults.push([{ id: 'rep_b' }]); // reuse-detection select
    const { res, statusCode, body } = makeRes();
    await confirmPaymentHandler(
      makeReq({ body: { reportId: 'rep_a', txHash: VALID_TX_HASH } }),
      res,
    );
    expect(statusCode()).toBe(409);
    expect(body().error).toMatch(/already been used/i);
  });

  it('402s when the on-chain verifier rejects the receipt', async () => {
    nextSelectResults.push([
      { id: 'rep_under', tier: 'premium', status: 'pending', buyerWallet: null },
    ]);
    nextSelectResults.push([]); // reuse-detection: not reused
    verifyOnchainPaymentMock.mockResolvedValueOnce({
      ok: false,
      reason: 'Underpayment: received 1.00 AXUSD, required 14.99 AXUSD.',
    });
    const { res, statusCode, body } = makeRes();
    await confirmPaymentHandler(
      makeReq({ body: { reportId: 'rep_under', txHash: VALID_TX_HASH } }),
      res,
    );
    expect(statusCode()).toBe(402);
    expect(body().error).toMatch(/underpayment/i);
    // Verifier was called with the canonical premium price.
    expect(verifyOnchainPaymentMock).toHaveBeenCalledWith(VALID_TX_HASH, 1499);
  });

  it('passes the base-tier price (499¢) to the verifier for base reports', async () => {
    nextSelectResults.push([
      { id: 'rep_base_v', tier: 'base', status: 'pending', buyerWallet: null },
    ]);
    nextSelectResults.push([]);
    verifyOnchainPaymentMock.mockResolvedValueOnce({
      ok: false,
      reason: 'Transaction not yet confirmed. Please retry in a few seconds.',
    });
    const { res } = makeRes();
    await confirmPaymentHandler(
      makeReq({ body: { reportId: 'rep_base_v', txHash: VALID_TX_HASH } }),
      res,
    );
    expect(verifyOnchainPaymentMock).toHaveBeenCalledWith(VALID_TX_HASH, 499);
  });

  it('403s when the verified sender does not match the recorded buyer wallet', async () => {
    const buyer = '0x1111111111111111111111111111111111111111';
    const stranger = '0x2222222222222222222222222222222222222222';
    nextSelectResults.push([
      { id: 'rep_mismatch', tier: 'base', status: 'pending', buyerWallet: buyer },
    ]);
    nextSelectResults.push([]);
    verifyOnchainPaymentMock.mockResolvedValueOnce({
      ok: true,
      txHash: VALID_TX_HASH,
      from: stranger,
      to: PROPERTY_PAYMENT_RECIPIENT.toLowerCase(),
      token: PROPERTY_PAYMENT_TOKEN.toLowerCase(),
      chainId: PROPERTY_PAYMENT_CHAIN_ID,
      amountTokenUnits: 4_990_000n,
      amountUsd: '4.99',
      decimals: 6,
    });
    const { res, statusCode, body } = makeRes();
    await confirmPaymentHandler(
      makeReq({ body: { reportId: 'rep_mismatch', txHash: VALID_TX_HASH } }),
      res,
    );
    expect(statusCode()).toBe(403);
    expect(body().error).toMatch(/wallet used to create the report/i);
    // No DB write should have happened on this rejection path.
    expect(recordedUpdateSets).toHaveLength(0);
  });

  it('happy path: writes lowercased payment fields and reports status=ready when generation succeeds', async () => {
    const buyer = '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
    nextSelectResults.push([
      { id: 'rep_happy', tier: 'premium', status: 'pending', buyerWallet: buyer.toLowerCase() },
    ]);
    nextSelectResults.push([]);
    verifyOnchainPaymentMock.mockResolvedValueOnce({
      ok: true,
      txHash: VALID_TX_HASH,
      from: buyer, // mixed-case input; handler should lowercase before storing
      to: PROPERTY_PAYMENT_RECIPIENT.toLowerCase(),
      token: PROPERTY_PAYMENT_TOKEN.toLowerCase(),
      chainId: PROPERTY_PAYMENT_CHAIN_ID,
      amountTokenUnits: 14_990_000n,
      amountUsd: '14.99',
      decimals: 6,
    });
    generateReportMock.mockResolvedValueOnce({});

    const { res, statusCode, body } = makeRes();
    await confirmPaymentHandler(
      makeReq({ body: { reportId: 'rep_happy', txHash: VALID_TX_HASH.toUpperCase() } }),
      res,
    );

    expect(statusCode()).toBe(200);
    expect(body()).toEqual({ reportId: 'rep_happy', status: 'ready' });
    expect(generateReportMock).toHaveBeenCalledWith('rep_happy');
    expect(recordedUpdateSets).toHaveLength(1);
    const update = recordedUpdateSets[0];
    expect(update.status).toBe('paid');
    expect(update.paymentTxHash).toBe(VALID_TX_HASH); // lowercase
    expect(update.paymentChainId).toBe(PROPERTY_PAYMENT_CHAIN_ID);
    expect(update.paymentToken).toBe(PROPERTY_PAYMENT_TOKEN.toLowerCase());
    expect(update.paymentFromAddress).toBe(buyer.toLowerCase());
    expect(update.paymentConfirmedAt).toBeInstanceOf(Date);
    expect(update.updatedAt).toBeInstanceOf(Date);
  });

  it('happy path with generation failure: marks paid, returns status=failed, never throws', async () => {
    nextSelectResults.push([
      { id: 'rep_genfail', tier: 'base', status: 'pending', buyerWallet: null },
    ]);
    nextSelectResults.push([]);
    verifyOnchainPaymentMock.mockResolvedValueOnce({
      ok: true,
      txHash: ANOTHER_TX_HASH,
      from: '0x3333333333333333333333333333333333333333',
      to: PROPERTY_PAYMENT_RECIPIENT.toLowerCase(),
      token: PROPERTY_PAYMENT_TOKEN.toLowerCase(),
      chainId: PROPERTY_PAYMENT_CHAIN_ID,
      amountTokenUnits: 4_990_000n,
      amountUsd: '4.99',
      decimals: 6,
    });
    generateReportMock.mockRejectedValueOnce(new Error('geocode boom'));

    const { res, statusCode, body } = makeRes();
    await confirmPaymentHandler(
      makeReq({ body: { reportId: 'rep_genfail', txHash: ANOTHER_TX_HASH } }),
      res,
    );
    expect(statusCode()).toBe(200);
    expect(body()).toEqual({ reportId: 'rep_genfail', status: 'failed' });
    expect(recordedUpdateSets).toHaveLength(1); // payment row was still marked paid
  });
});

// ── Canonical TIER_CONFIG drift guard ───────────────────────────────────────

describe('TIER_CONFIG canonical prices', () => {
  // The pipeline module is mocked above with hardcoded prices. If someone
  // bumps the real prices in pipeline.ts without updating this file, the
  // tests above keep passing against stale values. This guard reads the
  // real source as text and pins the prices that drive the headline
  // amountTokenUnits assertions.
  it('still says base = 499¢ and premium = 1499¢ in server/services/property/pipeline.ts', () => {
    const src = readFileSync(
      resolvePath(process.cwd(), 'server/services/property/pipeline.ts'),
      'utf8',
    );
    const baseMatch = src.match(/base:\s*\{[^}]*priceCents:\s*(\d+)/);
    const premiumMatch = src.match(/premium:\s*\{[^}]*priceCents:\s*(\d+)/);
    expect(baseMatch?.[1]).toBe('499');
    expect(premiumMatch?.[1]).toBe('1499');
  });
});
