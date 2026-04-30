/**
 * tests/stripe-account-guard.test.ts
 *
 * Task #400 — DB rows tagged with `stripe_account_id` + read-then-call
 * guard. This file unit-tests the guard surface in `lib/stripe/client.ts`
 * (account-id pin + `assertCurrentStripeAccount`) without hitting Stripe
 * or the database. The Stripe SDK is mocked so `getStripe()`'s one-shot
 * `accounts.retrieve()` resolves to a controllable account id.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mutable mock state — must be hoisted so the `vi.mock` factory below
// can close over it (vi.mock is hoisted to the top of the file by vitest).
const mockState = vi.hoisted(() => ({
  retrieveCalls: 0,
  resolvedAccountId: 'acct_NEW',
  chargesEnabled: true,
}));

vi.mock('stripe', () => {
  // Real-looking constructor — must be a `class` (or `function`) so that
  // `new Stripe(key)` works. Arrow-fn-based vi.fn() implementations
  // throw "is not a constructor".
  class StripeMock {
    accounts: {
      retrieve: () => Promise<{ id: string; charges_enabled: boolean }>;
    };
    constructor(_key: string) {
      this.accounts = {
        retrieve: async () => {
          mockState.retrieveCalls += 1;
          return {
            id: mockState.resolvedAccountId,
            charges_enabled: mockState.chargesEnabled,
          };
        },
      };
    }
  }
  return { default: StripeMock };
});

// Import AFTER vi.mock so the mocked module is already registered.
import * as client from '../lib/stripe/client';

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIG_ENV };
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  delete process.env.STRIPE_EXPECTED_ACCOUNT_ID;
  delete process.env.STRIPE_EXPECTED_KEY_ID;
  mockState.retrieveCalls = 0;
  mockState.resolvedAccountId = 'acct_NEW';
  mockState.chargesEnabled = true;
  client._resetStripeClientForTests();
});

describe('getStripe / account-id pin', () => {
  it('passes when STRIPE_EXPECTED_ACCOUNT_ID matches the resolved account', async () => {
    process.env.STRIPE_EXPECTED_ACCOUNT_ID = 'acct_NEW';
    const info = await client.getStripeAccountInfo();
    expect(info.accountId).toBe('acct_NEW');
    expect(info.expected).toBe('acct_NEW');
    expect(info.match).toBe(true);
  });

  it('passes when only the alias STRIPE_EXPECTED_KEY_ID is set', async () => {
    process.env.STRIPE_EXPECTED_KEY_ID = 'acct_NEW';
    const info = await client.getStripeAccountInfo();
    expect(info.accountId).toBe('acct_NEW');
    expect(info.expected).toBe('acct_NEW');
    expect(info.match).toBe(true);
  });

  it('throws StripeAccountMismatchError when the pin does not match', async () => {
    process.env.STRIPE_EXPECTED_ACCOUNT_ID = 'acct_OLD';
    await expect(client.getStripe()).rejects.toBeInstanceOf(client.StripeAccountMismatchError);
  });

  it('throws StripeNotConfiguredError when STRIPE_SECRET_KEY is missing', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    await expect(client.getStripe()).rejects.toBeInstanceOf(client.StripeNotConfiguredError);
  });

  it('treats empty / whitespace-only pin env vars as unset', async () => {
    process.env.STRIPE_EXPECTED_ACCOUNT_ID = '   ';
    const info = await client.getStripeAccountInfo();
    expect(info.expected).toBeNull();
    expect(info.match).toBe(true); // null pin → permissive
  });
});

describe('assertCurrentStripeAccount', () => {
  it('is a no-op for null / undefined / empty row account id', async () => {
    await expect(client.assertCurrentStripeAccount(null)).resolves.toBeUndefined();
    await expect(client.assertCurrentStripeAccount(undefined)).resolves.toBeUndefined();
    await expect(client.assertCurrentStripeAccount('')).resolves.toBeUndefined();
  });

  it('is a no-op when row account id matches the live account', async () => {
    await expect(client.assertCurrentStripeAccount('acct_NEW')).resolves.toBeUndefined();
  });

  it('throws LegacyStripeAccountError when row id ≠ live account', async () => {
    let caught: any = null;
    try {
      await client.assertCurrentStripeAccount('acct_OLD');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(client.LegacyStripeAccountError);
    expect(caught.rowAccountId).toBe('acct_OLD');
    expect(caught.currentAccountId).toBe('acct_NEW');
  });
});

describe('currentStripeAccountId', () => {
  it('returns the resolved live account id', async () => {
    expect(await client.currentStripeAccountId()).toBe('acct_NEW');
  });

  it('only calls accounts.retrieve once across many invocations (cache)', async () => {
    await client.currentStripeAccountId();
    await client.currentStripeAccountId();
    await client.currentStripeAccountId();
    expect(mockState.retrieveCalls).toBe(1);
  });
});
