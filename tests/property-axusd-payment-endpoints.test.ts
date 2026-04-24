// Backend tests for /api/property/create-payment-intent and
// /api/property/confirm-payment. The Playwright e2e mocks both endpoints
// in the browser, so the real handlers are otherwise uncovered. server/db,
// the on-chain helpers, and the report pipeline are mocked here so each
// test is hermetic. Real-helper coverage for buildPaymentInstruction and
// verifyOnchainPayment lives in property-onchain-payment-helpers.test.ts.

import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

type FakeRow = Record<string, unknown>;

interface FakeDb {
  insert(table: unknown): FakeDb;
  values(payload: FakeRow): FakeDb;
  returning(): Promise<FakeRow[]>;
  select(shape?: unknown): FakeDb;
  from(table: unknown): FakeDb;
  where(predicate: unknown): FakeDb;
  orderBy(spec: unknown): FakeDb;
  limit(n: number): Promise<FakeRow[]>;
  update(table: unknown): FakeDb;
  set(payload: FakeRow): FakeDb;
  then(onFulfilled: (v: unknown) => unknown): Promise<unknown>;
}

const recordedInsertValues: FakeRow[] = [];
const recordedUpdateSets: FakeRow[] = [];
let nextSelectResults: FakeRow[][] = [];
let nextInsertResults: FakeRow[][] = [];

vi.mock('../server/db', () => {
  // One singleton chain serves both handlers. Terminators (.returning for
  // insert, .limit for select) shift a queued result; .then resolves the
  // bare update().set().where() await path.
  const chain: FakeDb = {
    insert: () => chain,
    values(payload) {
      recordedInsertValues.push(payload);
      return chain;
    },
    returning: () => Promise.resolve(nextInsertResults.shift() ?? []),
    select: () => chain,
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve(nextSelectResults.shift() ?? []),
    update: () => chain,
    set(payload) {
      recordedUpdateSets.push(payload);
      return chain;
    },
    then: (onFulfilled) => Promise.resolve(onFulfilled(undefined)),
  };
  return { db: chain };
});

// buildPaymentInstruction is replaced with a 6-decimal version (AXUSD
// canonical) so tests never touch RPC. The real cents->units math is
// validated end-to-end against the production helper in
// property-onchain-payment-helpers.test.ts. verifyOnchainPayment is
// stubbed so each handler test can pin verifier output. Other named
// exports (PROPERTY_PAYMENT_*) flow through unchanged.
const verifyOnchainPaymentMock = vi.fn();

vi.mock('../lib/property/onchainPayment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/property/onchainPayment')>();
  return {
    ...actual,
    getPaymentTokenDecimals: async () => 6,
    buildPaymentInstruction: async (amountCents: number) => {
      const decimals = 6;
      const amountUsd = (amountCents / 100).toFixed(2);
      return {
        chainId: actual.PROPERTY_PAYMENT_CHAIN_ID,
        token: actual.PROPERTY_PAYMENT_TOKEN,
        recipient: actual.PROPERTY_PAYMENT_RECIPIENT,
        amountUsd,
        amountTokenUnits: ethers.parseUnits(amountUsd, decimals).toString(),
        decimals,
        symbol: 'AXUSD' as const,
      };
    },
    verifyOnchainPayment: (txHash: string, requiredAmountCents: number) =>
      verifyOnchainPaymentMock(txHash, requiredAmountCents),
  };
});

// Stand in for the pipeline module so we don't transitively load geocoder /
// RentCast / repliers. Prices are duplicated here on purpose; the drift
// guard at the bottom of this file pins them to pipeline.ts.
const generateReportMock = vi.fn();

vi.mock('../server/services/property/pipeline', () => ({
  TIER_CONFIG: {
    free: { label: 'Free Report', priceCents: 0, maxPerMonth: 3, dataSources: [] },
    base: { label: 'Base Report', priceCents: 499, maxPerMonth: 50, dataSources: [] },
    premium: { label: 'Premium Report', priceCents: 1499, maxPerMonth: 100, dataSources: [] },
  },
  generateReport: (id: string) => generateReportMock(id),
}));

const { default: createIntentHandler } = await import(
  '../pages/api/property/create-payment-intent'
);
const { default: confirmPaymentHandler } = await import(
  '../pages/api/property/confirm-payment'
);
const {
  PROPERTY_PAYMENT_CHAIN_ID,
  PROPERTY_PAYMENT_TOKEN,
  PROPERTY_PAYMENT_RECIPIENT,
} = await import('../lib/property/onchainPayment');

interface MockReqOptions {
  method?: string;
  body?: unknown;
}

function makeReq(opts: MockReqOptions = {}): NextApiRequest {
  const req: Partial<NextApiRequest> = {
    method: opts.method ?? 'POST',
    body: opts.body ?? {},
    query: {},
    headers: { 'x-forwarded-for': '10.0.0.1' },
    socket: { remoteAddress: '127.0.0.1' } as NextApiRequest['socket'],
  };
  return req as NextApiRequest;
}

function makeRes() {
  let statusCode = 200;
  let bodyJson = '';
  const res: Partial<NextApiResponse> = {
    status(code: number) {
      statusCode = code;
      return res as NextApiResponse;
    },
    json(data: unknown) {
      bodyJson = JSON.stringify(data);
      return res as NextApiResponse;
    },
    setHeader() {
      return res as NextApiResponse;
    },
  };
  return {
    res: res as NextApiResponse,
    statusCode: () => statusCode,
    body: <T = Record<string, unknown>>() => JSON.parse(bodyJson || '{}') as T,
  };
}

async function runHandler(
  handler: NextApiHandler,
  opts: MockReqOptions = {},
) {
  const ctx = makeRes();
  await handler(makeReq(opts), ctx.res);
  return ctx;
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

describe('POST /api/property/create-payment-intent', () => {
  it('rejects non-POST methods with 405', async () => {
    const { statusCode } = await runHandler(createIntentHandler, { method: 'GET' });
    expect(statusCode()).toBe(405);
  });

  it('400s when address is missing or too short', async () => {
    const { statusCode, body } = await runHandler(createIntentHandler, {
      body: { tier: 'base', wallet: VALID_WALLET },
    });
    expect(statusCode()).toBe(400);
    expect(body().error).toMatch(/address/i);
  });

  it('400s on an invalid tier', async () => {
    const { statusCode, body } = await runHandler(createIntentHandler, {
      body: { address: '123 Main St, Anytown, USA', tier: 'gold', wallet: VALID_WALLET },
    });
    expect(statusCode()).toBe(400);
    expect(body().error).toMatch(/tier/i);
  });

  it('400s when the wallet is missing or malformed', async () => {
    const { statusCode, body } = await runHandler(createIntentHandler, {
      body: { address: '123 Main St, Anytown, USA', tier: 'base', wallet: 'not-a-wallet' },
    });
    expect(statusCode()).toBe(400);
    expect(body().error).toMatch(/wallet/i);
  });

  it('returns amountTokenUnits = "4990000" for the base tier (499¢ × 10^6)', async () => {
    nextInsertResults.push([{ id: 'rep_base_001' }]);
    const { statusCode, body } = await runHandler(createIntentHandler, {
      body: { address: '123 Main St, Anytown, USA', tier: 'base', wallet: VALID_WALLET },
    });
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
    const { statusCode, body } = await runHandler(createIntentHandler, {
      body: { address: '123 Main St, Anytown, USA', tier: 'premium', wallet: VALID_WALLET },
    });
    expect(statusCode()).toBe(200);
    const json = body<{ payment: { amountTokenUnits: string; amountUsd: string } }>();
    expect(json.payment.amountTokenUnits).toBe('14990000');
    expect(json.payment.amountUsd).toBe('14.99');
  });

  it('returns the canonical recipient, token, and chainId', async () => {
    nextInsertResults.push([{ id: 'rep_recip' }]);
    const { body } = await runHandler(createIntentHandler, {
      body: { address: '1 Pine Ave', tier: 'base', wallet: VALID_WALLET },
    });
    const json = body<{ payment: { recipient: string; token: string; chainId: number } }>();
    expect(json.payment.chainId).toBe(PROPERTY_PAYMENT_CHAIN_ID);
    expect(json.payment.token.toLowerCase()).toBe(PROPERTY_PAYMENT_TOKEN.toLowerCase());
    expect(json.payment.recipient.toLowerCase()).toBe(PROPERTY_PAYMENT_RECIPIENT.toLowerCase());
    expect(json.payment.chainId).toBe(42161);
  });

  it('persists the row with lowercased wallet, the tier price, and the canonical recipient', async () => {
    nextInsertResults.push([{ id: 'rep_persist' }]);
    const { statusCode } = await runHandler(createIntentHandler, {
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
    });
    expect(statusCode()).toBe(200);
    expect(recordedInsertValues).toHaveLength(1);
    const inserted = recordedInsertValues[0];
    expect(inserted.tier).toBe('premium');
    expect(inserted.status).toBe('pending');
    expect(inserted.amountPaidCents).toBe(1499);
    expect(inserted.buyerWallet).toBe(VALID_WALLET.toLowerCase());
    expect(inserted.paymentChainId).toBe(PROPERTY_PAYMENT_CHAIN_ID);
    expect(String(inserted.paymentToken).toLowerCase()).toBe(PROPERTY_PAYMENT_TOKEN.toLowerCase());
    expect(String(inserted.paymentToAddress).toLowerCase()).toBe(
      PROPERTY_PAYMENT_RECIPIENT.toLowerCase(),
    );
    expect(inserted.sqft).toBe(1800);
    expect(inserted.bedrooms).toBe(3);
    expect(inserted.bathrooms).toBe('2.5');
    expect(inserted.yearBuilt).toBe(1995);
    expect(inserted.propertyType).toBe('single_family');
  });
});

describe('POST /api/property/confirm-payment', () => {
  it('rejects non-POST methods with 405', async () => {
    const { statusCode } = await runHandler(confirmPaymentHandler, { method: 'GET' });
    expect(statusCode()).toBe(405);
  });

  it('400s when reportId is missing', async () => {
    const { statusCode } = await runHandler(confirmPaymentHandler, {
      body: { txHash: VALID_TX_HASH },
    });
    expect(statusCode()).toBe(400);
  });

  it('400s when txHash is missing', async () => {
    const { statusCode } = await runHandler(confirmPaymentHandler, {
      body: { reportId: 'rep_1' },
    });
    expect(statusCode()).toBe(400);
  });

  it('404s when the report does not exist', async () => {
    nextSelectResults.push([]);
    const { statusCode, body } = await runHandler(confirmPaymentHandler, {
      body: { reportId: 'rep_missing', txHash: VALID_TX_HASH },
    });
    expect(statusCode()).toBe(404);
    expect(body().error).toMatch(/not found/i);
  });

  it('400s on free-tier reports (no payment required)', async () => {
    nextSelectResults.push([
      { id: 'rep_free', tier: 'free', status: 'pending', buyerWallet: null, paymentTxHash: null },
    ]);
    const { statusCode } = await runHandler(confirmPaymentHandler, {
      body: { reportId: 'rep_free', txHash: VALID_TX_HASH },
    });
    expect(statusCode()).toBe(400);
  });

  it('is idempotent: returns 200 + current status when the report already moved past pending', async () => {
    nextSelectResults.push([{ id: 'rep_paid', tier: 'base', status: 'ready', buyerWallet: null }]);
    const { statusCode, body } = await runHandler(confirmPaymentHandler, {
      body: { reportId: 'rep_paid', txHash: VALID_TX_HASH },
    });
    expect(statusCode()).toBe(200);
    expect(body()).toEqual({ reportId: 'rep_paid', status: 'ready' });
    expect(verifyOnchainPaymentMock).not.toHaveBeenCalled();
  });

  it('409s when the same tx hash was already used to pay for a different report', async () => {
    nextSelectResults.push([{ id: 'rep_a', tier: 'base', status: 'pending', buyerWallet: null }]);
    nextSelectResults.push([{ id: 'rep_b' }]);
    const { statusCode, body } = await runHandler(confirmPaymentHandler, {
      body: { reportId: 'rep_a', txHash: VALID_TX_HASH },
    });
    expect(statusCode()).toBe(409);
    expect(body().error).toMatch(/already been used/i);
  });

  it('402s when the on-chain verifier rejects the receipt', async () => {
    nextSelectResults.push([
      { id: 'rep_under', tier: 'premium', status: 'pending', buyerWallet: null },
    ]);
    nextSelectResults.push([]);
    verifyOnchainPaymentMock.mockResolvedValueOnce({
      ok: false,
      reason: 'Underpayment: received 1.00 AXUSD, required 14.99 AXUSD.',
    });
    const { statusCode, body } = await runHandler(confirmPaymentHandler, {
      body: { reportId: 'rep_under', txHash: VALID_TX_HASH },
    });
    expect(statusCode()).toBe(402);
    expect(body().error).toMatch(/underpayment/i);
    expect(verifyOnchainPaymentMock).toHaveBeenCalledWith(VALID_TX_HASH, 1499);
  });

  it('402s and surfaces the verifier reason when the on-chain transfer went to the wrong recipient', async () => {
    nextSelectResults.push([
      { id: 'rep_wrongto', tier: 'base', status: 'pending', buyerWallet: null },
    ]);
    nextSelectResults.push([]);
    verifyOnchainPaymentMock.mockResolvedValueOnce({
      ok: false,
      reason: `No AXUSD transfer to ${PROPERTY_PAYMENT_RECIPIENT.toLowerCase()} found in the receipt logs.`,
    });
    const { statusCode, body } = await runHandler(confirmPaymentHandler, {
      body: { reportId: 'rep_wrongto', txHash: VALID_TX_HASH },
    });
    expect(statusCode()).toBe(402);
    expect(body().error).toMatch(/no AXUSD transfer to/i);
    expect(recordedUpdateSets).toHaveLength(0);
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
    await runHandler(confirmPaymentHandler, {
      body: { reportId: 'rep_base_v', txHash: VALID_TX_HASH },
    });
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
    const { statusCode, body } = await runHandler(confirmPaymentHandler, {
      body: { reportId: 'rep_mismatch', txHash: VALID_TX_HASH },
    });
    expect(statusCode()).toBe(403);
    expect(body().error).toMatch(/wallet used to create the report/i);
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
      from: buyer,
      to: PROPERTY_PAYMENT_RECIPIENT.toLowerCase(),
      token: PROPERTY_PAYMENT_TOKEN.toLowerCase(),
      chainId: PROPERTY_PAYMENT_CHAIN_ID,
      amountTokenUnits: 14_990_000n,
      amountUsd: '14.99',
      decimals: 6,
    });
    generateReportMock.mockResolvedValueOnce({});

    const { statusCode, body } = await runHandler(confirmPaymentHandler, {
      body: { reportId: 'rep_happy', txHash: VALID_TX_HASH.toUpperCase() },
    });

    expect(statusCode()).toBe(200);
    expect(body()).toEqual({ reportId: 'rep_happy', status: 'ready' });
    expect(generateReportMock).toHaveBeenCalledWith('rep_happy');
    expect(recordedUpdateSets).toHaveLength(1);
    const update = recordedUpdateSets[0];
    expect(update.status).toBe('paid');
    expect(update.paymentTxHash).toBe(VALID_TX_HASH);
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

    const { statusCode, body } = await runHandler(confirmPaymentHandler, {
      body: { reportId: 'rep_genfail', txHash: ANOTHER_TX_HASH },
    });
    expect(statusCode()).toBe(200);
    expect(body()).toEqual({ reportId: 'rep_genfail', status: 'failed' });
    expect(recordedUpdateSets).toHaveLength(1);
  });
});

describe('TIER_CONFIG canonical prices', () => {
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
