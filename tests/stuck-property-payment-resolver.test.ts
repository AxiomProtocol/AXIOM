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

// Mock the buyer-notification emails (task #275). The resolver imports these
// directly; we verify they are called best-effort and that resolver writes
// still complete even if a mail send throws.
const sendReadyEmailMock = vi.fn();
const sendExpiredEmailMock = vi.fn();
vi.mock('../lib/email/resend', () => ({
  sendPropertyReportReadyEmail: (args: unknown) => sendReadyEmailMock(args),
  sendPropertyReportExpiredEmail: (args: unknown) => sendExpiredEmailMock(args),
}));

// ─── DB mock: query-by-query queues for select() and update() ────────────────
//
// Drizzle uses fluent chains; we model both .select()...await chains and
// .update().set().where() chains. Each call returns the next queued result.

const selectQueue: unknown[][] = [];
const updateCalls: Array<{ values: unknown; whereDescribed: boolean }> = [];
// One entry per `.update().set().where().returning()` call. Tests can push
// `[]` to simulate a no-op update (e.g. row already moved out of pending);
// otherwise the mock defaults to a single-row "row was updated" response so
// callers that gate side-effects on `updated.length > 0` see a write happen.
const updateReturningQueue: unknown[][] = [];

function pushSelect(rows: unknown[]) {
  selectQueue.push(rows);
}

function pushUpdateReturning(rows: unknown[]) {
  updateReturningQueue.push(rows);
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
    returning() {
      // Default to "one row was updated" so call sites that gate side-effects
      // on `updated.length > 0` see a write happen. Tests can preload an
      // empty array to simulate a no-op (race) update.
      const next = updateReturningQueue.shift() ?? [{ id: 'mock-updated' }];
      return Promise.resolve(next);
    },
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
  updateReturningQueue.length = 0;
  verifyMock.mockReset();
  generateReportMock.mockReset();
  sendReadyEmailMock.mockReset();
  sendExpiredEmailMock.mockReset();
  // Default: emails resolve so they don't accidentally swallow real failures.
  sendReadyEmailMock.mockResolvedValue({ id: 'email-ready' });
  sendExpiredEmailMock.mockResolvedValue({ id: 'email-expired' });
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

describe('resolveStuckPayments — buyer notification emails (task #275)', () => {
  it('emails the buyer with a report link + Arbiscan tx URL when an auto-confirm succeeds', async () => {
    pushSelect([makePendingRow()]);
    pushSelect([]); // re-use check inside promoteToPaid

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

    expect(summary.resolved).toEqual([{ reportId: 'rep-1', txHash: TX, status: 'ready' }]);
    expect(sendReadyEmailMock).toHaveBeenCalledTimes(1);
    expect(sendExpiredEmailMock).not.toHaveBeenCalled();

    const emailArgs = sendReadyEmailMock.mock.calls[0][0] as Record<string, unknown>;
    expect(emailArgs.to).toBe('buyer@example.com');
    expect(emailArgs.reportId).toBe('rep-1');
    expect(emailArgs.address).toBe('123 Main St');
    expect(emailArgs.txHash).toBe(TX);
    expect(emailArgs.amountAxusd).toBe('4.99');
    // Arbiscan link must be on Arbitrum One (chainId 42161 → arbiscan.io).
    expect(String(emailArgs.arbiscanUrl)).toMatch(/^https:\/\/arbiscan\.io\/tx\/0x[0-9a-f]+$/i);
    expect(String(emailArgs.arbiscanUrl)).toContain(TX);
  });

  it('emails the buyer when a stuck pending row is expired', async () => {
    pushSelect([
      makePendingRow({ id: 'rep-old', createdAt: new Date(Date.now() - 100 * 60 * 60_000) }),
    ]);
    __setStuckPaymentProvider(fakeProvider([]));

    const summary = await resolveStuckPayments();

    expect(summary.expired).toEqual(['rep-old']);
    expect(sendExpiredEmailMock).toHaveBeenCalledTimes(1);
    expect(sendReadyEmailMock).not.toHaveBeenCalled();

    const emailArgs = sendExpiredEmailMock.mock.calls[0][0] as Record<string, unknown>;
    expect(emailArgs.to).toBe('buyer@example.com');
    expect(emailArgs.reportId).toBe('rep-old');
    expect(emailArgs.address).toBe('123 Main St');
  });

  it('skips email send when the buyer never provided an email (no Resend call attempted)', async () => {
    const noEmailRow = { ...makePendingRow({ id: 'rep-anon' }), buyerEmail: null };
    pushSelect([noEmailRow]);
    pushSelect([]); // re-use check

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

    expect(summary.resolved).toEqual([{ reportId: 'rep-anon', txHash: TX, status: 'ready' }]);
    expect(sendReadyEmailMock).not.toHaveBeenCalled();
    expect(sendExpiredEmailMock).not.toHaveBeenCalled();
  });

  it('still completes the resolver write when the email send throws (best-effort)', async () => {
    pushSelect([makePendingRow({ id: 'rep-mailfail' })]);
    pushSelect([]); // re-use check

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
    sendReadyEmailMock.mockRejectedValueOnce(new Error('Resend down'));
    __setStuckPaymentProvider(
      fakeProvider([{ blockNumber: 999_500, index: 0, transactionHash: TX }]),
    );

    const summary = await resolveStuckPayments();

    // Resolver still reports success — the email is best-effort.
    expect(summary.resolved).toEqual([
      { reportId: 'rep-mailfail', txHash: TX, status: 'ready' },
    ]);
    expect(summary.errors).toEqual([]);
    expect(sendReadyEmailMock).toHaveBeenCalledTimes(1);
    // The DB update to paid must still have been written.
    const paidUpdate = updateCalls.find(
      (c) => (c.values as Record<string, unknown>).status === 'paid',
    );
    expect(paidUpdate).toBeTruthy();
  });

  it('does not send the expired email when the expiry update is a no-op (row already moved out of pending by another path)', async () => {
    pushSelect([
      makePendingRow({ id: 'rep-race', createdAt: new Date(Date.now() - 100 * 60 * 60_000) }),
    ]);
    __setStuckPaymentProvider(fakeProvider([]));
    // Simulate the race: another path already promoted the row out of
    // pending before our update fires, so .returning() yields zero rows.
    pushUpdateReturning([]);

    const summary = await resolveStuckPayments();

    // No DB transition happened on this call → summary should NOT report it
    // as expired (and the no-op guard prevents the buyer email from firing).
    expect(summary.expired).toEqual([]);
    expect(summary.unresolvedReportIds).toEqual(['rep-race']);
    expect(sendExpiredEmailMock).not.toHaveBeenCalled();
    expect(sendReadyEmailMock).not.toHaveBeenCalled();
  });

  it('still completes the expiry write when the expired-email send throws', async () => {
    pushSelect([
      makePendingRow({ id: 'rep-old-mailfail', createdAt: new Date(Date.now() - 100 * 60 * 60_000) }),
    ]);
    __setStuckPaymentProvider(fakeProvider([]));
    sendExpiredEmailMock.mockRejectedValueOnce(new Error('Resend down'));

    const summary = await resolveStuckPayments();

    expect(summary.expired).toEqual(['rep-old-mailfail']);
    expect(summary.errors).toEqual([]);
    expect(sendExpiredEmailMock).toHaveBeenCalledTimes(1);
    const expiredUpdate = updateCalls.find(
      (c) => (c.values as Record<string, unknown>).status === 'expired',
    );
    expect(expiredUpdate).toBeTruthy();
  });
});

describe('TRANSFER_TOPIC sanity', () => {
  it('exposes the canonical ERC-20 Transfer topic so getLogs filters stay correct', () => {
    expect(TRANSFER_TOPIC).toBe(
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    );
  });
});
