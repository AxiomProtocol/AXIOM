/**
 * tests/ach-recon-amount-format.test.ts
 *
 * Regression test for task #202: the reconciliation fallback path used to
 * pass `observedAmount` as raw absolute cents (`String(Math.abs(tx.amount))`,
 * e.g. "50000") whereas the webhook mapper produces a decimal USD string
 * (e.g. "500.00"). The rest of the system (settlement processor, dispatcher
 * validation, decimalStringToCents) expects the decimal format, so the
 * mismatch caused spurious huge AMOUNT_MISMATCH drift on any downstream
 * comparison.
 *
 * This test pins the contract: both paths must serialize the same integer
 * cents value into the same canonical decimal USD string, and the value
 * must round-trip cleanly through decimalStringToCents.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import { mapAchEvent, centsToDecimalString } from '../lib/capinfra/webhooks/achMapping';
import { decimalStringToCents } from '../lib/capinfra/adapters/ach/sdk';

function buildTransactionCreatedPayload(amountCents: number) {
  return {
    category: 'transaction.created',
    created_at: '2026-01-15T12:00:00Z',
    transaction: {
      id: 'transaction_test_1',
      account_id: 'account_test_1',
      amount: amountCents,
      currency: 'USD',
      description: 'test',
      created_at: '2026-01-15T12:00:00Z',
      route_type: 'ach',
      source: { ach_transfer_id: 'ach_transfer_test_1' },
    },
  };
}

describe('ACH reconciliation observedAmount format consistency', () => {
  const samples: Array<{ cents: number; expected: string }> = [
    { cents: -50000, expected: '500.00' },
    { cents: 50000, expected: '500.00' },
    { cents: -1234, expected: '12.34' },
    { cents: 500, expected: '5.00' },
    { cents: -1, expected: '0.01' },
    { cents: 0, expected: '0.00' },
    { cents: 99, expected: '0.99' },
    { cents: -1000000, expected: '10000.00' },
  ];

  it.each(samples)(
    'centsToDecimalString($cents) === "$expected"',
    ({ cents, expected }) => {
      expect(centsToDecimalString(cents)).toBe(expected);
    },
  );

  it.each(samples)(
    'mapAchEvent and centsToDecimalString agree for $cents cents',
    ({ cents, expected }) => {
      const intent = mapAchEvent(buildTransactionCreatedPayload(cents));
      expect(intent).not.toBeNull();
      expect(intent!.observedAmount).toBe(expected);
      expect(intent!.observedAmount).toBe(centsToDecimalString(cents));
    },
  );

  it.each(samples)(
    'observedAmount round-trips through decimalStringToCents for $cents cents',
    ({ cents }) => {
      const decimal = centsToDecimalString(cents);
      expect(decimalStringToCents(decimal)).toBe(BigInt(Math.abs(cents)));
    },
  );

  it('reconciliation fallback path uses centsToDecimalString for observedAmount', () => {
    // Source-level guard: ensure increaseDiff.ts no longer serializes the raw
    // absolute cents value into observedAmount. If this regresses, the
    // reconciler-driven SETTLE will write "50000" instead of "500.00" and the
    // webhook processor's amount comparison will report a 100x mismatch.
    const source = readFileSync(
      join(__dirname, '..', 'lib', 'capinfra', 'reconciliation', 'increaseDiff.ts'),
      'utf8',
    );

    // The fallback path (lines around the externallySettleInstruction call)
    // must call centsToDecimalString(tx.amount) for observedAmount, NOT
    // String(Math.abs(tx.amount)).
    expect(source).toMatch(/observedAmount:\s*centsToDecimalString\(tx\.amount\)/);
    expect(source).not.toMatch(/observedAmount:\s*String\(Math\.abs\(tx\.amount\)\)/);
    expect(source).toMatch(/from\s+'\.\.\/webhooks\/achMapping'/);
  });

  it('reconciliation MISSING_LOCAL remediation path uses centsToDecimalString for createInstruction amount', () => {
    // Source-level guard for task #214: the sibling MISSING_LOCAL remediation
    // path (where the reconciler auto-creates a local instruction for an
    // unmatched remote Increase transaction) must also serialize tx.amount via
    // centsToDecimalString so the persisted amount matches the decimal USD
    // format the webhook mapper produces. If this regresses, the auto-created
    // instruction will be persisted with an amount 100x too large (raw cents
    // like "50000" instead of "500.00") and downstream comparisons via
    // decimalStringToCents will misread it.
    const source = readFileSync(
      join(__dirname, '..', 'lib', 'capinfra', 'reconciliation', 'increaseDiff.ts'),
      'utf8',
    );

    expect(source).toMatch(/const amountStr = centsToDecimalString\(tx\.amount\);/);
    expect(source).not.toMatch(/const amountStr = String\(Math\.abs\(tx\.amount\)\);/);
  });
});
