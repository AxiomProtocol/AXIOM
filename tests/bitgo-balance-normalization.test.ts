/**
 * tests/bitgo-balance-normalization.test.ts
 *
 * Unit tests for normalizeBitGoBalance() in BitGoTreasuryExtension.
 *
 * The BitGo API returns balances in atomic units (smallest denomination).
 * These tests verify that:
 *   1. Each coin is normalized by the correct decimal exponent
 *   2. USDC uses 6 decimals (NOT 18 — the old bug)
 *   3. ETH-family coins use 18 decimals
 *   4. Zero and empty inputs return 0
 *   5. The suspicious magnitude guard does not throw (it only warns)
 *
 * See the comment block in BitGoTreasuryExtension.ts for the authoritative
 * statement of the unit assumption.
 */

import { describe, it, expect, vi } from 'vitest';
import { normalizeBitGoBalance } from '../lib/services/BitGoTreasuryExtension';

describe('normalizeBitGoBalance', () => {
  // ── PAXG (18 decimals) ──────────────────────────────────────────────────

  it('normalizes PAXG atomic units to decimal quantity', () => {
    // 0.009717 PAXG = 9_717_000_000_000_000 atomic units (18 decimals)
    const result = normalizeBitGoBalance('9717000000000000', 'paxg');
    expect(result).toBeCloseTo(0.009717, 10);
  });

  it('normalizes 1 full PAXG correctly', () => {
    const result = normalizeBitGoBalance('1000000000000000000', 'paxg');
    expect(result).toBeCloseTo(1.0, 10);
  });

  it('normalizes a fractional PAXG below 1', () => {
    // 0.5 PAXG = 500000000000000000
    const result = normalizeBitGoBalance('500000000000000000', 'paxg');
    expect(result).toBeCloseTo(0.5, 10);
  });

  // ── USDC (6 decimals) ───────────────────────────────────────────────────

  it('normalizes USDC using 6 decimal places (NOT 18)', () => {
    // 1.00 USDC = 1_000_000 atomic units (6 decimals)
    const result = normalizeBitGoBalance('1000000', 'usdc');
    expect(result).toBeCloseTo(1.0, 8);
  });

  it('normalizes 100 USDC correctly', () => {
    const result = normalizeBitGoBalance('100000000', 'usdc');
    expect(result).toBeCloseTo(100.0, 8);
  });

  it('USDC vs ETH: same raw string produces different quantities', () => {
    // "1000000" as USDC = 1.0 USDC, as arbeth = 0.000000000001 ETH
    const usdc   = normalizeBitGoBalance('1000000', 'usdc');
    const arbeth = normalizeBitGoBalance('1000000', 'arbeth');
    expect(usdc).toBeCloseTo(1.0, 8);
    expect(arbeth).toBeCloseTo(1e-12, 20);
    expect(usdc).not.toEqual(arbeth);
  });

  // ── arbeth / tarbeth (18 decimals) ─────────────────────────────────────

  it('normalizes arbeth (Arbitrum ETH) using 18 decimal places', () => {
    // 0.001979 ETH = 1_979_000_000_000_000 atomic units
    const result = normalizeBitGoBalance('1979000000000000', 'arbeth');
    expect(result).toBeCloseTo(0.001979, 10);
  });

  it('normalizes tarbeth (testnet) using 18 decimal places', () => {
    const result = normalizeBitGoBalance('1979000000000000', 'tarbeth');
    expect(result).toBeCloseTo(0.001979, 10);
  });

  it('normalizes 1 full ETH correctly', () => {
    const result = normalizeBitGoBalance('1000000000000000000', 'arbeth');
    expect(result).toBeCloseTo(1.0, 10);
  });

  // ── AXM / AXUSD (18 decimals) ───────────────────────────────────────────

  it('normalizes AXM using 18 decimal places', () => {
    const result = normalizeBitGoBalance('1000000000000000000', 'axm');
    expect(result).toBeCloseTo(1.0, 10);
  });

  it('normalizes AXUSD using 18 decimal places', () => {
    // 10048.55 AXUSD
    const result = normalizeBitGoBalance('10048550000000000000000', 'axusd');
    expect(result).toBeCloseTo(10048.55, 4);
  });

  // ── Zero / empty inputs ──────────────────────────────────────────────────

  it('returns 0 for zero balance string', () => {
    expect(normalizeBitGoBalance('0', 'paxg')).toBe(0);
  });

  it('returns 0 for empty balance string', () => {
    expect(normalizeBitGoBalance('', 'paxg')).toBe(0);
  });

  // ── Unknown coins ────────────────────────────────────────────────────────

  it('defaults to 18 decimals for unknown coins and warns in non-production', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result  = normalizeBitGoBalance('1000000000000000000', 'unknowncoin');
    expect(result).toBeCloseTo(1.0, 10);
    // Should warn in test environment (NODE_ENV !== 'production')
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown coin "unknowncoin"'),
    );
    warnSpy.mockRestore();
  });

  // ── Accounting rule: old inline / 1e18 was wrong for USDC ────────────────

  it('demonstrates the old / 1e18 bug for USDC', () => {
    // The old code did: parseFloat(balanceStr) / 1e18 for ALL coins.
    // For USDC this understates the balance by a factor of 10^12.
    const rawStr  = '1000000'; // 1.0 USDC in atomic units
    const correct = normalizeBitGoBalance(rawStr, 'usdc');   // = 1.0
    const bugged  = parseFloat(rawStr) / 1e18;               // = 1e-12

    expect(correct).toBeCloseTo(1.0, 8);
    expect(bugged).toBeCloseTo(1e-12, 20);
    // Difference is 10^12 — would have made USDC appear worthless
    expect(correct / bugged).toBeCloseTo(1e12, 0);
  });
});
