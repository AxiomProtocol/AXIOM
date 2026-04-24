/**
 * tests/stuck-property-payment-resolver.test.ts
 *
 * Tests for lib/property/stuckPaymentResolver — the task #248 sweep that
 * auto-confirms (or expires) pending property-report rows whose buyer never
 * POSTed the tx hash to /api/property/confirm-payment.
 *
 * Covers:
 *   1. Pending row + matching on-chain Transfer → mark paid + run generate
 *   2. Pending row + no transfer + still inside expiry window → unchanged
 *   3. Pending row + no transfer + past expiry window → mark expired
 *   4. resolveSingleByTxHash refuses non-pending rows (idempotency)
 *   5. resolveSingleByTxHash refuses tx hash already used by another row
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ethers } from 'ethers';

const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');
const RECIPIENT = '0x000000000000000000000000000000000000beef';
const TOKEN = '0x73585df5e62a5e85e6dd6b1df3c08e00eee5b89c';

// ─── Mock the on-chain payment helper module BEFORE importing resolver ───────
// The resolver pulls PROPERTY_PAYMENT_RECIPIENT/TOKEN at module-eval time and
// calls verifyOnchainPayment per resolution. We mock both so we don't need a
// live RPC. (This must run before `await import('../lib/property/...')`.)
vi.mock('../lib/property/onchainPayment', () => {
  const verifyOnchainPayment = vi.fn();
  return {
    PROPERTY_PAYMENT_CHAIN_ID: 42161,
    PROPERTY_PAYMENT_RECIPIENT: RECIPIENT,
    PROPERTY_PAYMENT_TOKEN: TOKEN,
    verifyOnchainPayment,
  };
});

// Mock the report pipeline so we can assert generateReport was invoked.
const generateReportMock = vi.fn();
vi.mock('../server/services/property/pipeline', () => ({
  generateReport: (id: string) => generateReportMock(id),
  TIER_CONFIG: {
    free: { label: 'Free', priceCents: 0, maxPerMonth: 3, dataSources: [] },
    base: { label: 'Base', priceCents: 499, maxPerMonth: 50, dataSources: [] },
    premium: { label: 'Premium', priceCents: 1499, maxPerMonth: 100, dataSources: [] },
  },
}));

// ─── DB mock: query-by-query queues for select() and update() ────────────────
//
// Drizzle uses fluent chains; we model both .select()...await chains and
// .update().set().where() chains. Each call returns the next queued result.

const selectQueue: unknown[][] = [];
const updateCalls: Array<{ values: unknown; whereDescribed: boolean }> = [];

function pushSelect(rows: unknown[]) {
  selectQueue.push(rows);
}

vi.mock('../server/db', () => {
  const selectChain: any = {
    select() { return selectChain; },
    from() { return selectChain; },
    where() { return selectChain; },
    orderBy() { return selectChain; },
    limit() {
      const result = selectQueue.shift() ?? [];
      return Promise.resolve(result);
    },
    // Also support `await db.select()...where(...)` (no .limit) — some call
    // sites await right after .where(). Our resolver always uses .limit() or
    // returns from a chain, so this is just a safety net.
    then(resolve: (v: unknown) => unknown) {
      const result = selectQueue.shift() ?? [];
      return Promise.resolve(resolve(result));
    },
  };

  const updateChain: any = {
    update() { return updateChain; },
    set(values: unknown) {
      updateCalls.push({ values, whereDescribed: false });
      return updateChain;
    },
    where() {
      const last = updateCalls[updateCalls.length - 1];
      if (last) last.whereDescribed = true;
      return updateChain;
    },
    returning() { return Promise.resolve([]); },
    then(resolve: (v: unknown) => unknown) {
      return Promise.resolve(resolve(undefined));
    },
  };

  return {
    db: {
      select: selectChain.select,
      update: updateChain.update,
    },
  };
});

// ─── Now import the modules under test ───────────────────────────────────────

const { verifyOnchainPayment } = await import('../lib/property/onchainPayment');
const verifyMock = verifyOnchainPayment as unknown as ReturnType<typeof vi.fn>;

const {
  resolveStuckPayments,
  resolveSingleByTxHash,
  __setStuckPaymentProvider,
} = await import('../lib/property/stuckPaymentResolver');

// ─── Provider fake ───────────────────────────────────────────────────────────

interface FakeLog {
  blockNumber: number;
  index: number;
  transactionHash: string;
}

function fakeProvider(logs: FakeLog[], latestBlock = 1_000_000) {
  return {
    async getBlockNumber() { return latestBlock; },
    async getLogs() {
      // Return all logs every time — the resolver dedupes by picking newest.
      return logs as unknown as ethers.Log[];
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BUYER = '0x1111111111111111111111111111111111111111';
const TX = '0x' + 'a'.repeat(64);

function makePendingRow(overrides: Partial<{ id: string; createdAt: Date; tier: string }> = {}) {
  return {
    id: overrides.id ?? 'rep-1',
    tier: overrides.tier ?? 'base',
    addressRaw: '123 Main St',
    buyerWallet: BUYER,
    buyerEmail: 'buyer@example.com',
    createdAt: overrides.createdAt ?? new Date(Date.now() - 60 * 60_000),
    amountPaidCents: 499,
  };
}

beforeEach(() => {
  selectQueue.length = 0;
  updateCalls.length = 0;
  verifyMock.mockReset();
  generateReportMock.mockReset();
  __setStuckPaymentProvider(null);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('resolveStuckPayments — auto-confirm path', () => {
  it('promotes pending rows to paid and runs generateReport when a matching transfer exists', async () => {
    // First select() = listStuckPending result
    pushSelect([makePendingRow()]);
    // Second select() = "tx hash already used by another report?" check inside promoteToPaid
    pushSelect([]);

    verifyMock.mockResolvedValueOnce({
      ok: true,
      txHash: TX,
      from: BUYER,
      to: RECIPIENT,
      token: TOKEN,
      chainId: 42161,
      amountTokenUnits: 499n * 10000n,
      amountUsd: '4.99',
      decimals: 6,
    });
    generateReportMock.mockResolvedValueOnce({});

    __setStuckPaymentProvider(
      fakeProvider([{ blockNumber: 999_500, index: 0, transactionHash: TX }]),
    );

    const summary = await resolveStuckPayments();

    expect(summary.scanned).toBe(1);
    expect(summary.resolved).toEqual([{ reportId: 'rep-1', txHash: TX, status: 'ready' }]);
    expect(summary.expired).toEqual([]);
    expect(summary.errors).toEqual([]);
    expect(verifyMock).toHaveBeenCalledWith(TX, 499);
    expect(generateReportMock).toHaveBeenCalledWith('rep-1');
    // The update-to-paid should have been emitted (we don't assert exact set
    // shape — that's covered by confirm-payment.ts). At minimum a status
    // mutation must have happened.
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    const paidUpdate = updateCalls.find(
      (c) => (c.values as Record<string, unknown>).status === 'paid',
    );
    expect(paidUpdate).toBeTruthy();
  });
});

describe('resolveStuckPayments — no-transfer paths', () => {
  it('leaves a young pending row alone when no transfer is found', async () => {
    // Row is 30 minutes old — past the 15-min freshness gate but well inside
    // the 72-hour expiry window.
    pushSelect([makePendingRow({ createdAt: new Date(Date.now() - 30 * 60_000) })]);
    __setStuckPaymentProvider(fakeProvider([]));

    const summary = await resolveStuckPayments();

    expect(summary.scanned).toBe(1);
    expect(summary.resolved).toEqual([]);
    expect(summary.expired).toEqual([]);
    expect(summary.unresolvedReportIds).toEqual(['rep-1']);
    // No DB writes should happen for an unresolved-but-young row.
    expect(updateCalls).toEqual([]);
    expect(generateReportMock).not.toHaveBeenCalled();
  });

  it('expires pending rows older than the maxPendingAgeHours window', async () => {
    // 100 hours old — past the default 72-hour expiry threshold.
    pushSelect([
      makePendingRow({ id: 'rep-old', createdAt: new Date(Date.now() - 100 * 60 * 60_000) }),
    ]);
    __setStuckPaymentProvider(fakeProvider([]));

    const summary = await resolveStuckPayments();

    expect(summary.scanned).toBe(1);
    expect(summary.resolved).toEqual([]);
    expect(summary.expired).toEqual(['rep-old']);
    const expiredUpdate = updateCalls.find(
      (c) => (c.values as Record<string, unknown>).status === 'expired',
    );
    expect(expiredUpdate).toBeTruthy();
  });
});

describe('resolveSingleByTxHash — operator manual path', () => {
  it('refuses to overwrite a row that is no longer pending (idempotency)', async () => {
    pushSelect([{ id: 'rep-x', tier: 'base', status: 'paid', buyerWallet: BUYER }]);

    const result = await resolveSingleByTxHash('rep-x', TX);
    expect(result).toEqual({ ok: false, reason: expect.stringMatching(/already paid/i) });
    expect(verifyMock).not.toHaveBeenCalled();
    expect(updateCalls).toEqual([]);
  });

  it('refuses to confirm with a tx hash already bound to another report', async () => {
    pushSelect([{ id: 'rep-y', tier: 'base', status: 'pending', buyerWallet: BUYER }]);
    // After verification passes, we look for re-use; return another row.
    pushSelect([{ id: 'rep-other' }]);

    verifyMock.mockResolvedValueOnce({
      ok: true,
      txHash: TX,
      from: BUYER,
      to: RECIPIENT,
      token: TOKEN,
      chainId: 42161,
      amountTokenUnits: 499n * 10000n,
      amountUsd: '4.99',
      decimals: 6,
    });

    const result = await resolveSingleByTxHash('rep-y', TX);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/already used/i);
    }
    // Should not have written paid/generation for this row.
    expect(generateReportMock).not.toHaveBeenCalled();
    const paidUpdate = updateCalls.find(
      (c) => (c.values as Record<string, unknown>).status === 'paid',
    );
    expect(paidUpdate).toBeUndefined();
  });

  it('refuses to confirm a tx hash whose sender does not match the recorded buyer wallet', async () => {
    // The row was created with BUYER but the on-chain transfer came from a
    // different wallet — operator must not be able to mis-confirm it.
    pushSelect([{ id: 'rep-z', tier: 'base', status: 'pending', buyerWallet: BUYER }]);

    const wrongSender = '0x2222222222222222222222222222222222222222';
    verifyMock.mockResolvedValueOnce({
      ok: true,
      txHash: TX,
      from: wrongSender,
      to: RECIPIENT,
      token: TOKEN,
      chainId: 42161,
      amountTokenUnits: 499n * 10000n,
      amountUsd: '4.99',
      decimals: 6,
    });

    const result = await resolveSingleByTxHash('rep-z', TX);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/sent from the wallet recorded/i);
    }
    expect(generateReportMock).not.toHaveBeenCalled();
    const paidUpdate = updateCalls.find(
      (c) => (c.values as Record<string, unknown>).status === 'paid',
    );
    expect(paidUpdate).toBeUndefined();
  });
});

describe('TRANSFER_TOPIC sanity', () => {
  it('exposes the canonical ERC-20 Transfer topic so getLogs filters stay correct', () => {
    expect(TRANSFER_TOPIC).toBe(
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    );
  });
});
