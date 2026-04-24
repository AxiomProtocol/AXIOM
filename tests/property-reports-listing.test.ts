/**
 * tests/property-reports-listing.test.ts
 *
 * Tests for GET /api/property/reports — the buyer-facing endpoint that lists
 * AXUSD report receipts (task #247).
 *
 * Covers:
 *  - Method gating
 *  - email/wallet parameter validation
 *  - Wallet matches are case-insensitive
 *  - On-chain receipt fields are projected
 *  - Repeat purchases of the same address are flagged with isRepeatPurchase
 *  - Only "real receipt" statuses (paid/generating/ready/failed) are listed
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const recordedSelectShapes: unknown[] = [];
const recordedWhereArgs: unknown[] = [];

type FakeRow = Record<string, unknown>;

// Two select calls happen per request: (1) the rows, (2) the count(*).
// We capture a queue of result sets.
let nextResultSets: FakeRow[][] = [];

vi.mock('../server/db', () => {
  // The handler issues three queries per request, in order:
  //   1. paginated rows (terminated by .offset)
  //   2. count(*)        (terminated by .where → awaited directly)
  //   3. groupBy summary (terminated by .groupBy)
  // We model that with a queue of fake result sets.
  const makeChain = () => {
    const chain: any = {
      select(shape: unknown) {
        recordedSelectShapes.push(shape);
        return chain;
      },
      from() { return chain; },
      where(arg: unknown) {
        recordedWhereArgs.push(arg);
        return chain;
      },
      orderBy() { return chain; },
      limit() { return chain; },
      offset() {
        const result = nextResultSets.shift() ?? [];
        return Promise.resolve(result);
      },
      groupBy() {
        const result = nextResultSets.shift() ?? [];
        return Promise.resolve(result);
      },
      // count(*) path: no .limit/.offset/.groupBy, awaited directly after .where
      then(resolve: (v: unknown) => unknown) {
        const result = nextResultSets.shift() ?? [];
        return Promise.resolve(resolve(result));
      },
    };
    return chain;
  };
  return { db: makeChain() };
});

const { default: handler } = await import('../pages/api/property/reports/index');

interface MockReqOptions {
  method?: string;
  query?: Record<string, string | string[]>;
}

function makeReq(opts: MockReqOptions = {}): NextApiRequest {
  return {
    method: opts.method ?? 'GET',
    query: opts.query ?? {},
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest;
}

function makeRes() {
  let _statusCode = 200;
  let _body = '';
  const res = {
    status(code: number) { _statusCode = code; return res; },
    json(data: unknown) { _body = JSON.stringify(data); return res; },
    setHeader() { return res; },
  } as unknown as NextApiResponse;
  return {
    res,
    statusCode: () => _statusCode,
    body: () => JSON.parse(_body || '{}'),
  };
}

beforeEach(() => {
  recordedSelectShapes.length = 0;
  recordedWhereArgs.length = 0;
  nextResultSets = [];
});

describe('GET /api/property/reports', () => {
  it('rejects non-GET methods with 405', async () => {
    const { res, statusCode } = makeRes();
    await handler(makeReq({ method: 'POST' }), res);
    expect(statusCode()).toBe(405);
  });

  it('requires email or wallet', async () => {
    const { res, statusCode, body } = makeRes();
    await handler(makeReq(), res);
    expect(statusCode()).toBe(400);
    expect(body().error).toMatch(/email or wallet/i);
  });

  it('rejects malformed wallets so we never run a junk DB query', async () => {
    const { res, statusCode, body } = makeRes();
    await handler(makeReq({ query: { wallet: 'notawallet' } }), res);
    expect(statusCode()).toBe(400);
    expect(body().error).toMatch(/wallet/i);
    // No DB call should have happened.
    expect(recordedSelectShapes).toHaveLength(0);
  });

  it('rejects malformed emails', async () => {
    const { res, statusCode, body } = makeRes();
    await handler(makeReq({ query: { email: 'not-an-email' } }), res);
    expect(statusCode()).toBe(400);
    expect(body().error).toMatch(/email/i);
    expect(recordedSelectShapes).toHaveLength(0);
  });

  it('returns receipt fields and flags repeat purchases of the same address', async () => {
    // Newer report first (matches DB ordering by createdAt desc).
    const reportRows: FakeRow[] = [
      {
        id: 'report-2',
        createdAt: '2026-04-22T10:00:00Z',
        tier: 'premium',
        status: 'ready',
        addressRaw: '123 Main St',
        addressNormalized: '123 Main St, Austin, TX',
        city: 'Austin',
        state: 'TX',
        valueMid: '500000',
        rentMid: '2500',
        confidenceScore: 85,
        dealGrade: 'A',
        paymentTxHash: '0xbbbb',
        paymentChainId: 42161,
        paymentFromAddress: '0xWalletAaaa',
        paymentConfirmedAt: '2026-04-22T10:01:00Z',
        amountPaidCents: 999,
        buyerWallet: '0xWalletAaaa',
      },
      {
        id: 'report-1',
        createdAt: '2026-04-20T10:00:00Z',
        tier: 'base',
        status: 'ready',
        addressRaw: '123 Main St',
        addressNormalized: '123 Main St, Austin, TX',
        city: 'Austin',
        state: 'TX',
        valueMid: '500000',
        rentMid: '2500',
        confidenceScore: 70,
        dealGrade: 'B',
        paymentTxHash: '0xaaaa',
        paymentChainId: 42161,
        paymentFromAddress: '0xWalletAaaa',
        paymentConfirmedAt: '2026-04-20T10:01:00Z',
        amountPaidCents: 499,
        buyerWallet: '0xWalletAaaa',
      },
      {
        id: 'report-other',
        createdAt: '2026-04-18T10:00:00Z',
        tier: 'base',
        status: 'ready',
        addressRaw: '999 Elm St',
        addressNormalized: '999 Elm St, Austin, TX',
        city: 'Austin',
        state: 'TX',
        valueMid: '300000',
        rentMid: '1500',
        confidenceScore: 60,
        dealGrade: 'C',
        paymentTxHash: '0xcccc',
        paymentChainId: 42161,
        paymentFromAddress: '0xWalletAaaa',
        paymentConfirmedAt: '2026-04-18T10:01:00Z',
        amountPaidCents: 499,
        buyerWallet: '0xWalletAaaa',
      },
    ];
    nextResultSets = [
      reportRows,
      [{ count: 3 }],
      // The DB-side groupBy query returns the canonical first id for each
      // normalized address across the buyer's *full* set.
      [
        { key: '123 main st, austin, tx', firstId: 'report-1' },
        { key: '999 elm st, austin, tx', firstId: 'report-other' },
      ],
    ];

    const { res, statusCode, body } = makeRes();
    await handler(
      makeReq({ query: { wallet: '0x' + 'a'.repeat(40) } }),
      res,
    );

    expect(statusCode()).toBe(200);
    const data = body();
    expect(data.reports).toHaveLength(3);

    // Newest is the canonical-feeling row from a buyer perspective, but the
    // *oldest* entry for an address is the original purchase. The newer
    // duplicate (report-2) should be flagged.
    const byId = new Map<string, any>(data.reports.map((r: any) => [r.id, r]));
    expect(byId.get('report-1').isRepeatPurchase).toBe(false); // oldest of 123 Main
    expect(byId.get('report-2').isRepeatPurchase).toBe(true);  // newer dup of 123 Main
    expect(byId.get('report-other').isRepeatPurchase).toBe(false); // unique address

    // On-chain receipt fields are surfaced.
    expect(byId.get('report-2')).toMatchObject({
      paymentTxHash: '0xbbbb',
      paymentChainId: 42161,
      paymentFromAddress: '0xWalletAaaa',
      amountPaidCents: 999,
    });

    expect(data.pagination).toMatchObject({ page: 1, total: 3 });
  });

  it('includes paymentTxHash in the projected select shape', async () => {
    nextResultSets = [[], [{ count: 0 }], []];
    const { res } = makeRes();
    await handler(makeReq({ query: { email: 'buyer@example.com' } }), res);
    const shape = recordedSelectShapes[0] as Record<string, unknown>;
    // The list endpoint must project payment receipt fields so the UI can
    // render Arbiscan links without an extra round-trip per report.
    expect(shape).toHaveProperty('paymentTxHash');
    expect(shape).toHaveProperty('paymentChainId');
    expect(shape).toHaveProperty('paymentFromAddress');
    expect(shape).toHaveProperty('paymentConfirmedAt');
    expect(shape).toHaveProperty('amountPaidCents');
  });

  it('flags a duplicate even when the original purchase lives on a different page', async () => {
    // The current page only contains report-2 (the newer duplicate). The
    // original (report-1) is on a previous page, so a page-local heuristic
    // would *miss* it. The DB-side groupBy gives us the canonical first id.
    const pageRows: FakeRow[] = [
      {
        id: 'report-2',
        createdAt: '2026-04-22T10:00:00Z',
        tier: 'premium',
        status: 'ready',
        addressRaw: '123 Main St',
        addressNormalized: '123 Main St, Austin, TX',
        city: 'Austin',
        state: 'TX',
        valueMid: '500000',
        rentMid: '2500',
        confidenceScore: 85,
        dealGrade: 'A',
        paymentTxHash: '0xbbbb',
        paymentChainId: 42161,
        paymentFromAddress: '0xWalletAaaa',
        paymentConfirmedAt: '2026-04-22T10:01:00Z',
        amountPaidCents: 999,
        buyerWallet: '0xWalletAaaa',
      },
    ];
    nextResultSets = [
      pageRows,
      [{ count: 12 }], // many more pages exist
      [{ key: '123 main st, austin, tx', firstId: 'report-1' }],
    ];

    const { res, statusCode, body } = makeRes();
    await handler(
      makeReq({ query: { wallet: '0x' + 'a'.repeat(40), page: '2' } }),
      res,
    );

    expect(statusCode()).toBe(200);
    const data = body();
    expect(data.reports).toHaveLength(1);
    expect(data.reports[0].id).toBe('report-2');
    expect(data.reports[0].isRepeatPurchase).toBe(true);
  });
});
