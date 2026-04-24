/**
 * tests/property-onchain-payment-helpers.test.ts
 *
 * Task #286 — backend coverage for the lib/property/onchainPayment helpers
 * that the AXUSD payment endpoints delegate to. The companion file
 * tests/property-axusd-payment-endpoints.test.ts covers handler control
 * flow (validation, idempotency, etc.) with the helpers stubbed; this file
 * exercises the REAL helpers with the RPC layer mocked, so regressions in
 *   - cents → AXUSD base-units math
 *   - the canonical payment recipient / token / chainId
 *   - the on-chain receipt parser (status, recipient match, token match,
 *     underpayment detection, sender extraction, tx-hash format guard)
 * cannot slip past the unit suite even though the endpoint tests stub
 * `verifyOnchainPayment` for speed.
 *
 * RPC isolation strategy:
 *   - `vi.spyOn(ethers.JsonRpcProvider.prototype, 'send')` makes any
 *     general JSON-RPC call throw. That forces `getPaymentTokenDecimals`
 *     down its documented fallback to 6 (canonical AXUSD GENIUS decimals)
 *     without ever touching the network.
 *   - `vi.spyOn(ethers.JsonRpcProvider.prototype, 'getTransactionReceipt')`
 *     is overridden per-test to return crafted receipts.
 *
 * The tests load the helpers via dynamic import so the shared module-level
 * `cachedDecimals` value is reset between groups via `vi.resetModules()`,
 * keeping each scenario hermetic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ethers } from 'ethers';

// ── Provider isolation ─────────────────────────────────────────────────────

let sendSpy: ReturnType<typeof vi.spyOn>;
let getReceiptSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Default: every JSON-RPC `send` (which underlies provider.call(),
  // contract.decimals(), etc.) fails fast. This pushes
  // getPaymentTokenDecimals onto its 6-decimal fallback path.
  sendSpy = vi
    .spyOn(ethers.JsonRpcProvider.prototype, 'send')
    .mockRejectedValue(new Error('RPC blocked in unit test'));

  // Default: no receipt found. Tests that need a receipt override per-call.
  getReceiptSpy = vi
    .spyOn(ethers.JsonRpcProvider.prototype, 'getTransactionReceipt')
    .mockResolvedValue(null);

  // Drop the helpers' module-level decimal cache between tests so the
  // first `getPaymentTokenDecimals` call in each test re-runs the
  // (mocked) fallback path. Drizzle and DB modules are not loaded by
  // onchainPayment, so this reset is cheap.
  vi.resetModules();
});

afterEach(() => {
  sendSpy.mockRestore();
  getReceiptSpy.mockRestore();
});

// ── Receipt builder ─────────────────────────────────────────────────────────

const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

interface TransferLogSpec {
  /** Token contract address that emitted the Transfer log. */
  address: string;
  from: string;
  to: string;
  /** Amount in token base units (6 decimals for AXUSD). */
  amount: bigint;
}

interface ReceiptSpec {
  status?: 0 | 1;
  /** receipt.from — only used when no Transfer log yields a from topic. */
  from?: string;
  /** Optional extra non-Transfer logs to confirm they're skipped. */
  logs?: TransferLogSpec[];
  extraLogs?: Array<{ address: string; topics: string[]; data: string }>;
}

function makeReceipt(spec: ReceiptSpec): ethers.TransactionReceipt {
  const transferLogs = (spec.logs ?? []).map((log) => ({
    address: log.address,
    topics: [
      TRANSFER_TOPIC,
      ethers.zeroPadValue(log.from, 32),
      ethers.zeroPadValue(log.to, 32),
    ],
    data: ethers.toBeHex(log.amount, 32),
  }));
  return {
    status: spec.status ?? 1,
    from: spec.from ?? '0x' + 'd'.repeat(40),
    logs: [...transferLogs, ...(spec.extraLogs ?? [])],
  } as unknown as ethers.TransactionReceipt;
}

// ── buildPaymentInstruction ────────────────────────────────────────────────

describe('buildPaymentInstruction (real helper, mocked RPC)', () => {
  it('produces 4_990_000 base units for the 499¢ base tier at AXUSD canonical 6 decimals', async () => {
    const mod = await import('../lib/property/onchainPayment');
    const inst = await mod.buildPaymentInstruction(499);
    expect(inst.amountTokenUnits).toBe('4990000');
    expect(inst.amountUsd).toBe('4.99');
    expect(inst.decimals).toBe(6);
    expect(inst.symbol).toBe('AXUSD');
    expect(inst.chainId).toBe(42161);
    expect(inst.token.toLowerCase()).toBe(mod.PROPERTY_PAYMENT_TOKEN.toLowerCase());
    expect(inst.recipient.toLowerCase()).toBe(mod.PROPERTY_PAYMENT_RECIPIENT.toLowerCase());
  });

  it('produces 14_990_000 base units for the 1499¢ premium tier', async () => {
    const mod = await import('../lib/property/onchainPayment');
    const inst = await mod.buildPaymentInstruction(1499);
    expect(inst.amountTokenUnits).toBe('14990000');
    expect(inst.amountUsd).toBe('14.99');
  });

  it('round-trips arbitrary cent amounts through ethers.parseUnits at 6 decimals', async () => {
    const mod = await import('../lib/property/onchainPayment');
    // 1¢ → 10000 base units, $1.00 → 1_000_000, $123.45 → 123_450_000
    expect((await mod.buildPaymentInstruction(1)).amountTokenUnits).toBe('10000');
    expect((await mod.buildPaymentInstruction(100)).amountTokenUnits).toBe('1000000');
    expect((await mod.buildPaymentInstruction(12345)).amountTokenUnits).toBe('123450000');
  });
});

// ── verifyOnchainPayment ───────────────────────────────────────────────────

describe('verifyOnchainPayment (real helper, mocked RPC)', () => {
  it('rejects malformed transaction hashes before touching the provider', async () => {
    const mod = await import('../lib/property/onchainPayment');
    const r = await mod.verifyOnchainPayment('not-a-hash', 499);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/invalid transaction hash/i);
    // We should not have called getTransactionReceipt at all.
    expect(getReceiptSpy).not.toHaveBeenCalled();
  });

  it('returns "not yet confirmed" when the provider has no receipt yet', async () => {
    getReceiptSpy.mockResolvedValueOnce(null);
    const mod = await import('../lib/property/onchainPayment');
    const r = await mod.verifyOnchainPayment('0x' + 'a'.repeat(64), 499);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/not yet confirmed/i);
  });

  it('rejects receipts whose status is 0 (transaction reverted)', async () => {
    getReceiptSpy.mockResolvedValueOnce(
      makeReceipt({
        status: 0,
        logs: [
          {
            address: '0x0000000000000000000000000000000000000000',
            from: '0x' + '1'.repeat(40),
            to: '0x' + '2'.repeat(40),
            amount: 0n,
          },
        ],
      }),
    );
    const mod = await import('../lib/property/onchainPayment');
    const r = await mod.verifyOnchainPayment('0x' + 'a'.repeat(64), 499);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/reverted/i);
  });

  it('rejects when the Transfer log is for the WRONG token contract', async () => {
    const mod = await import('../lib/property/onchainPayment');
    const wrongToken = '0xDeAdBeefdeadbeefDEADBEEFdeadbeefDEADBEEF';
    getReceiptSpy.mockResolvedValueOnce(
      makeReceipt({
        logs: [
          {
            address: wrongToken,
            from: '0x' + '1'.repeat(40),
            to: mod.PROPERTY_PAYMENT_RECIPIENT, // correct recipient
            amount: 4_990_000n, // correct amount
          },
        ],
      }),
    );
    const r = await mod.verifyOnchainPayment('0x' + 'a'.repeat(64), 499);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/no AXUSD transfer/i);
  });

  it('rejects when the Transfer goes to the WRONG recipient', async () => {
    const mod = await import('../lib/property/onchainPayment');
    const wrongRecipient = '0xCaFeBabecafeBABEcAFEBABEcaFEBabEcaFEbAbE';
    getReceiptSpy.mockResolvedValueOnce(
      makeReceipt({
        logs: [
          {
            address: mod.PROPERTY_PAYMENT_TOKEN, // correct token
            from: '0x' + '1'.repeat(40),
            to: wrongRecipient, // wrong destination
            amount: 4_990_000n,
          },
        ],
      }),
    );
    const r = await mod.verifyOnchainPayment('0x' + 'a'.repeat(64), 499);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/no AXUSD transfer/i);
  });

  it('detects underpayment (amount strictly less than required)', async () => {
    const mod = await import('../lib/property/onchainPayment');
    getReceiptSpy.mockResolvedValueOnce(
      makeReceipt({
        logs: [
          {
            address: mod.PROPERTY_PAYMENT_TOKEN,
            from: '0x' + '1'.repeat(40),
            to: mod.PROPERTY_PAYMENT_RECIPIENT,
            amount: 4_989_999n, // one base-unit short of $4.99
          },
        ],
      }),
    );
    const r = await mod.verifyOnchainPayment('0x' + 'a'.repeat(64), 499);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/underpayment/i);
  });

  it('accepts an exact AXUSD transfer to the canonical recipient and extracts the sender', async () => {
    const mod = await import('../lib/property/onchainPayment');
    const buyer = '0x1111111111111111111111111111111111111111';
    getReceiptSpy.mockResolvedValueOnce(
      makeReceipt({
        logs: [
          {
            address: mod.PROPERTY_PAYMENT_TOKEN,
            from: buyer,
            to: mod.PROPERTY_PAYMENT_RECIPIENT,
            amount: 4_990_000n,
          },
        ],
      }),
    );
    const r = await mod.verifyOnchainPayment('0x' + 'a'.repeat(64), 499);
    expect(r.ok).toBe(true);
    if (r.ok) {
      // ethers.getAddress checksums the sender we extracted from topic[1].
      expect(r.from.toLowerCase()).toBe(buyer.toLowerCase());
      expect(r.to).toBe(mod.PROPERTY_PAYMENT_RECIPIENT.toLowerCase());
      expect(r.token).toBe(mod.PROPERTY_PAYMENT_TOKEN.toLowerCase());
      expect(r.chainId).toBe(42161);
      expect(r.amountTokenUnits).toBe(4_990_000n);
      expect(r.amountUsd).toBe('4.99');
      expect(r.decimals).toBe(6);
    }
  });

  it('accepts overpayment and sums multiple Transfer logs to the same recipient', async () => {
    const mod = await import('../lib/property/onchainPayment');
    const buyer = '0x2222222222222222222222222222222222222222';
    getReceiptSpy.mockResolvedValueOnce(
      makeReceipt({
        logs: [
          {
            address: mod.PROPERTY_PAYMENT_TOKEN,
            from: buyer,
            to: mod.PROPERTY_PAYMENT_RECIPIENT,
            amount: 3_000_000n,
          },
          {
            address: mod.PROPERTY_PAYMENT_TOKEN,
            from: buyer,
            to: mod.PROPERTY_PAYMENT_RECIPIENT,
            amount: 2_000_000n, // total = 5_000_000 ($5.00 > $4.99)
          },
        ],
      }),
    );
    const r = await mod.verifyOnchainPayment('0x' + 'a'.repeat(64), 499);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.amountTokenUnits).toBe(5_000_000n);
  });

  it('ignores unrelated logs (e.g. a different ERC-20 Transfer in the same tx)', async () => {
    const mod = await import('../lib/property/onchainPayment');
    const buyer = '0x3333333333333333333333333333333333333333';
    getReceiptSpy.mockResolvedValueOnce(
      makeReceipt({
        logs: [
          {
            address: '0xfeedfeedfeedfeedfeedfeedfeedfeedfeedfeed', // unrelated token
            from: buyer,
            to: mod.PROPERTY_PAYMENT_RECIPIENT,
            amount: 999_000_000n, // huge but wrong token: must be ignored
          },
          {
            address: mod.PROPERTY_PAYMENT_TOKEN, // correct token + recipient
            from: buyer,
            to: mod.PROPERTY_PAYMENT_RECIPIENT,
            amount: 14_990_000n, // exact premium price
          },
        ],
      }),
    );
    const r = await mod.verifyOnchainPayment('0x' + 'a'.repeat(64), 1499);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.amountTokenUnits).toBe(14_990_000n);
  });

  it('surfaces RPC errors as a structured failure rather than throwing', async () => {
    getReceiptSpy.mockRejectedValueOnce(new Error('upstream 503'));
    const mod = await import('../lib/property/onchainPayment');
    const r = await mod.verifyOnchainPayment('0x' + 'a'.repeat(64), 499);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/rpc error/i);
  });
});
