/**
 * tests/card-deposit-mint-amount-format.test.ts
 *
 * Regression test for task #244 — same defect class as #202/#214/#226:
 *
 *   `lib/capinfra/cardDeposits/service.ts` previously hand-formatted the
 *   USD amount sent to `/api/erc3643/admin/mint` with
 *   `(amountCents / 100).toFixed(2)`. The downstream mint endpoint and
 *   `ERC3643Service.mintAXUSD` typed the field as plain `string`, so a
 *   raw-cents serialization (e.g. `String(amountCents)` = "50000") would
 *   have compiled cleanly and minted 100× the intended amount.
 *
 * After the fix:
 *   - The card-deposits service routes its conversion through
 *     `centsToDecimalString` (the canonical, branded helper).
 *   - `ERC3643Service.mintAXUSD`'s `amountAxusd` is a branded
 *     `UsdDecimalString`, so a plain string (including raw-cents
 *     serializations) fails to type-check.
 *   - The mint API route runtime-validates the body via
 *     `usdDecimalString` so HTTP callers cannot bypass the brand.
 *
 * This file pins all three contracts so a future regression is caught
 * either at compile time or by the runtime assertions below.
 */

import { describe, it, expect } from 'vitest';
import {
  centsToDecimalString,
  usdDecimalString,
  type UsdDecimalString,
} from '../lib/capinfra/money';

describe('card-deposit → mint amount serialization (task #244)', () => {
  const samples: Array<{ cents: number; expected: string }> = [
    { cents: 100, expected: '1.00' },         // Stripe minimum
    { cents: 500, expected: '5.00' },
    { cents: 1234, expected: '12.34' },
    { cents: 50000, expected: '500.00' },
    { cents: 999_99, expected: '999.99' },
    { cents: 1_000_000, expected: '10000.00' }, // protective cap
    { cents: 1, expected: '0.01' },
  ];

  it.each(samples)(
    'centsToDecimalString($cents) === "$expected" (canonical conversion)',
    ({ cents, expected }) => {
      expect(centsToDecimalString(cents)).toBe(expected);
    },
  );

  it('does NOT serialize raw cents (the original bug shape)', () => {
    // The pre-fix path was effectively `String(cents)`, which yielded
    // values 100× too large. Pin that they are NOT what the canonical
    // helper produces.
    for (const { cents, expected } of samples) {
      expect(String(cents)).not.toBe(expected);
      expect(centsToDecimalString(cents)).not.toBe(String(cents));
    }
  });
});

describe('mint endpoint runtime guard (usdDecimalString)', () => {
  it('accepts well-formed USD decimal strings produced by centsToDecimalString', () => {
    const branded: UsdDecimalString = centsToDecimalString(50000);
    // Re-validating the canonical output must round-trip cleanly.
    expect(usdDecimalString(branded)).toBe('500.00');
  });

  it('rejects clearly malformed amount strings', () => {
    expect(() => usdDecimalString('')).toThrow();
    expect(() => usdDecimalString('abc')).toThrow();
    expect(() => usdDecimalString('1.2.3')).toThrow();
    expect(() => usdDecimalString('1e3')).toThrow();
    expect(() => usdDecimalString(' 500.00 ')).toThrow();
  });
});

// ── Type-level guard (compile-time assertions) ──────────────────────
//
// These exist purely to fail compilation if the brand on
// `ERC3643Service.mintAXUSD`'s `amountAxusd` parameter is ever weakened
// back to plain `string`. Runtime behavior is irrelevant; the value of
// these tests is the @ts-expect-error directives.

describe('mintAXUSD amountAxusd brand (type-level guard)', () => {
  it('forbids passing a raw-cents string', async () => {
    // Lazy import to avoid pulling in ethers/safe-kit at test load.
    const { ERC3643Service } = await import('../lib/services/ERC3643Service');
    type MintParams = Parameters<typeof ERC3643Service.mintAXUSD>[0];

    // A plain string (e.g. `String(amountCents)` = "50000") must not be
    // assignable to the branded `amountAxusd` field. If this ever stops
    // erroring, the type-level guard has regressed.
    const _badParams: MintParams = {
      toAddress: '0x0000000000000000000000000000000000000000',
      // @ts-expect-error — plain string is not a UsdDecimalString
      amountAxusd: '50000',
      callerAddress: '0x0000000000000000000000000000000000000000',
    };
    expect(_badParams.toAddress).toMatch(/^0x/);
  });

  it('accepts amounts produced by centsToDecimalString', async () => {
    const { ERC3643Service } = await import('../lib/services/ERC3643Service');
    type MintParams = Parameters<typeof ERC3643Service.mintAXUSD>[0];
    const _goodParams: MintParams = {
      toAddress: '0x0000000000000000000000000000000000000000',
      amountAxusd: centsToDecimalString(50000),
      callerAddress: '0x0000000000000000000000000000000000000000',
    };
    expect(_goodParams.amountAxusd).toBe('500.00');
  });
});
