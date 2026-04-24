/**
 * Unit tests for the canonical money helpers and type-level guards.
 *
 * The runtime behavior is straightforward; the more important coverage
 * here is the *type-level* guard that prevents the cents-vs-decimal
 * regression that tasks #202 and #214 fixed.
 */

import { describe, it, expect } from 'vitest';
import {
  centsToDecimalString,
  usdDecimalString,
  tryUsdDecimalString,
  decimalStringToCents,
  asCents,
  type UsdDecimalString,
} from './money';

describe('centsToDecimalString', () => {
  it('formats positive whole-dollar amounts', () => {
    expect(centsToDecimalString(50000)).toBe('500.00');
  });

  it('formats sub-dollar amounts with zero-padded fraction', () => {
    expect(centsToDecimalString(1)).toBe('0.01');
    expect(centsToDecimalString(7)).toBe('0.07');
  });

  it('takes the absolute value of negative cents', () => {
    expect(centsToDecimalString(-1234)).toBe('12.34');
  });

  it('throws on non-integer cents', () => {
    expect(() => centsToDecimalString(1.5)).toThrow();
    expect(() => centsToDecimalString(NaN)).toThrow();
  });
});

describe('usdDecimalString', () => {
  it('accepts well-formed USD decimals', () => {
    expect(usdDecimalString('500.00')).toBe('500.00');
    expect(usdDecimalString('0.01')).toBe('0.01');
    expect(usdDecimalString('99')).toBe('99');
  });

  it('accepts Stellar 7-decimal precision (Horizon values like "12.3456789")', () => {
    expect(usdDecimalString('12.3456789')).toBe('12.3456789');
  });

  it('rejects malformed amount strings', () => {
    expect(() => usdDecimalString('not-a-number')).toThrow();
    expect(() => usdDecimalString('1.2.3')).toThrow();
    expect(() => usdDecimalString('')).toThrow();
  });
});

describe('tryUsdDecimalString — Stellar precision', () => {
  it('does not silently null Stellar 7-decimal amounts', () => {
    expect(tryUsdDecimalString('12.3456789')).toBe('12.3456789');
  });
});

describe('tryUsdDecimalString', () => {
  it('returns null on null/undefined/malformed input', () => {
    expect(tryUsdDecimalString(null)).toBeNull();
    expect(tryUsdDecimalString(undefined)).toBeNull();
    expect(tryUsdDecimalString('abc')).toBeNull();
  });

  it('brands valid input', () => {
    const v = tryUsdDecimalString('12.34');
    expect(v).toBe('12.34');
  });
});

describe('decimalStringToCents', () => {
  it('round-trips with centsToDecimalString', () => {
    for (const c of [0, 1, 99, 100, 9999, 10000, 1234567]) {
      expect(decimalStringToCents(centsToDecimalString(c))).toBe(BigInt(c));
    }
  });
});

describe('asCents', () => {
  it('throws on non-integer numbers', () => {
    expect(() => asCents(1.5)).toThrow();
  });

  it('passes through valid integers', () => {
    expect(asCents(100)).toBe(100);
  });
});

// ── Type-level guard (compile-time assertions) ──────────────────────
//
// These tests exercise the brand at the type level. If the brand were
// removed or weakened, the assignments inside @ts-expect-error blocks
// would compile and the tests would fail to compile.

describe('UsdDecimalString brand (type-level guard)', () => {
  it('forbids assigning a raw string', () => {
    // @ts-expect-error — plain string is not assignable to UsdDecimalString
    const bad: UsdDecimalString = '500.00';
    expect(typeof bad).toBe('string');
  });

  it('forbids serializing cents directly via String()', () => {
    const cents = 50000;
    // @ts-expect-error — String(cents) yields plain string, not branded
    const bad: UsdDecimalString = String(cents);
    expect(bad).toBe('50000');
  });

  it('allows the result of the canonical helpers', () => {
    const fromCents: UsdDecimalString = centsToDecimalString(50000);
    const fromString: UsdDecimalString = usdDecimalString('500.00');
    expect(fromCents).toBe('500.00');
    expect(fromString).toBe('500.00');
  });
});
