// Real-helper coverage for lib/property/onchainPayment. The endpoint test
// file stubs these helpers for handler control-flow speed; this file
// exercises the production buildPaymentInstruction and verifyOnchainPayment
// against crafted ethers TransactionReceipt objects with the RPC layer
// neutralized via prototype spies.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ethers } from 'ethers';

let sendSpy: ReturnType<typeof vi.spyOn>;
let getReceiptSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Make every JSON-RPC call fail. This drives getPaymentTokenDecimals
  // onto its documented 6-decimal fallback without touching the network.
  sendSpy = vi
    .spyOn(ethers.JsonRpcProvider.prototype, 'send')
    .mockRejectedValue(new Error('RPC blocked in unit test'));

  // Default: no receipt. Tests that need one override per-call.
  getReceiptSpy = vi
    .spyOn(ethers.JsonRpcProvider.prototype, 'getTransactionReceipt')
    .mockResolvedValue(null);

  // Reset module-level cachedDecimals between tests so each scenario
  // independently exercises the decimals fallback path.
  vi.resetModules();
});

afterEach(() => {
  sendSpy.mockRestore();
  getReceiptSpy.mockRestore();
});

const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

interface TransferLogSpec {
  address: string;
  from: string;
  to: string;
  amount: bigint;
}

interface ReceiptSpec {
  status?: 0 | 1;
  from?: string;
  logs?: TransferLogSpec[];
}

function makeReceipt(spec: ReceiptSpec): ethers.TransactionReceipt {
  const logs = (spec.logs ?? []).map((log) => ({
    address: log.address,
    topics: [
      TRANSFER_TOPIC,
      ethers.zeroPadValue(log.from, 32),
      ethers.zeroPadValue(log.to, 32),
    ],
    data: ethers.toBeHex(log.amount, 32),
  }));
  // ethers.TransactionReceipt is a class with private state; tests only
  // need the fields the helper reads (status, from, logs[].address,
  // logs[].topics, logs[].data), so a structural cast is sufficient.
  return { status: spec.status ?? 1, from: spec.from ?? '0x' + 'd'.repeat(40), logs } as
    ethers.TransactionReceipt;
}

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
    expect((await mod.buildPaymentInstruction(1)).amountTokenUnits).toBe('10000');
    expect((await mod.buildPaymentInstruction(100)).amountTokenUnits).toBe('1000000');
    expect((await mod.buildPaymentInstruction(12345)).amountTokenUnits).toBe('123450000');
  });
});

describe('verifyOnchainPayment (real helper, mocked RPC)', () => {
  it('rejects malformed transaction hashes before touching the provider', async () => {
    const mod = await import('../lib/property/onchainPayment');
    const r = await mod.verifyOnchainPayment('not-a-hash', 499);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/invalid transaction hash/i);
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
    getReceiptSpy.mockResolvedValueOnce(
      makeReceipt({
        logs: [
          {
            address: '0xDeAdBeefdeadbeefDEADBEEFdeadbeefDEADBEEF',
            from: '0x' + '1'.repeat(40),
            to: mod.PROPERTY_PAYMENT_RECIPIENT,
            amount: 4_990_000n,
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
    getReceiptSpy.mockResolvedValueOnce(
      makeReceipt({
        logs: [
          {
            address: mod.PROPERTY_PAYMENT_TOKEN,
            from: '0x' + '1'.repeat(40),
            to: '0xCaFeBabecafeBABEcAFEBABEcaFEBabEcaFEbAbE',
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
            amount: 4_989_999n,
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
            amount: 2_000_000n,
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
            address: '0xfeedfeedfeedfeedfeedfeedfeedfeedfeedfeed',
            from: buyer,
            to: mod.PROPERTY_PAYMENT_RECIPIENT,
            amount: 999_000_000n,
          },
          {
            address: mod.PROPERTY_PAYMENT_TOKEN,
            from: buyer,
            to: mod.PROPERTY_PAYMENT_RECIPIENT,
            amount: 14_990_000n,
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
