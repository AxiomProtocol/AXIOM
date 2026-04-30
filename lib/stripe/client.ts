/**
 * Stripe client + account-scoping guard.
 *
 * Background: this codebase historically called `new Stripe(process.env.STRIPE_SECRET_KEY)`
 * inline at three different call sites. After a Stripe-account swap (task #398
 * moved us from `acct_1TOTd0ERnK9EuJkU` to `acct_1MBRQRL7nVuSbK4H`), an operator
 * who pastes the wrong key into Replit Secrets would silently start writing
 * customers, sessions, and subscriptions onto the wrong account — and the only
 * symptom would be a divergent dashboard. To prevent that regression class, every
 * Stripe call now goes through `getStripe()`, which:
 *
 *   1. Lazily constructs a single Stripe client per process.
 *   2. On first use, calls `stripe.accounts.retrieve()` exactly once and caches
 *      the resolved account id for the lifetime of the process.
 *   3. If `STRIPE_EXPECTED_ACCOUNT_ID` is set and the resolved id differs,
 *      throws `StripeAccountMismatchError` — every Stripe-bearing flow
 *      (checkout-create, subscription-cancel, webhook signature-verify) hits
 *      the same guard, so the failure is loud and fast.
 *   4. If `STRIPE_EXPECTED_ACCOUNT_ID` is unset, the verification still runs
 *      and the resolved id is logged once, but no enforcement happens (back
 *      compat with environments that haven't set the expected-id pin yet).
 *
 * The verification result is memoised, so the cost is one `/v1/account` call
 * per process boot — not per request. Webhook signature verification does not
 * pay this cost on the hot path because `constructEvent` is a pure crypto
 * function on the imported Stripe namespace and does not require a verified
 * client.
 */

import Stripe from 'stripe';

export class StripeAccountMismatchError extends Error {
  readonly expectedAccountId: string;
  readonly actualAccountId: string;
  constructor(expected: string, actual: string) {
    super(
      `Stripe account mismatch: STRIPE_SECRET_KEY resolves to ${actual} ` +
        `but STRIPE_EXPECTED_ACCOUNT_ID is set to ${expected}. ` +
        `Refusing to proceed — rotate the key or update the expected-id pin.`,
    );
    this.name = 'StripeAccountMismatchError';
    this.expectedAccountId = expected;
    this.actualAccountId = actual;
  }
}

export class StripeNotConfiguredError extends Error {
  constructor() {
    super('STRIPE_SECRET_KEY is not configured');
    this.name = 'StripeNotConfiguredError';
  }
}

let _client: Stripe | null = null;
let _verification: Promise<{ accountId: string; chargesEnabled: boolean }> | null = null;

function buildClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeNotConfiguredError();
  if (!_client) {
    _client = new Stripe(key);
  }
  return _client;
}

/**
 * Returns a Stripe client whose backing key has been verified against
 * STRIPE_EXPECTED_ACCOUNT_ID (if set). Throws `StripeAccountMismatchError`
 * on mismatch. Caches the verification per process.
 */
export async function getStripe(): Promise<Stripe> {
  const client = buildClient();
  if (!_verification) {
    _verification = (async () => {
      const acct = await client.accounts.retrieve();
      const accountId = acct.id ?? '';
      const expected = process.env.STRIPE_EXPECTED_ACCOUNT_ID;
      if (expected && expected !== accountId) {
        // Reset the cache so a corrected key on the next process can recover
        // (the wrong client itself is fine, the throw just refuses to use it).
        _verification = null;
        throw new StripeAccountMismatchError(expected, accountId);
      }
      if (!expected) {
        // First-time soft-warn so an operator at least sees what the key
        // resolves to in the logs after a deploy.
        // eslint-disable-next-line no-console
        console.warn(
          `[stripe] STRIPE_EXPECTED_ACCOUNT_ID not set; running against ${accountId}.`,
        );
      } else {
        // eslint-disable-next-line no-console
        console.log(`[stripe] verified account ${accountId}.`);
      }
      return { accountId, chargesEnabled: !!acct.charges_enabled };
    })();
  }
  await _verification;
  return client;
}

/**
 * Returns the resolved account info. Convenience for status endpoints.
 *
 * IMPORTANT: this routes through `getStripe()` so the same account-id
 * enforcement runs. Calling this helper before any other Stripe code path
 * cannot bypass the mismatch check — if `STRIPE_EXPECTED_ACCOUNT_ID` is set
 * and differs from the resolved id, this throws `StripeAccountMismatchError`
 * exactly like every other call site.
 */
export async function getStripeAccountInfo(): Promise<{
  accountId: string;
  chargesEnabled: boolean;
  expected: string | null;
  match: boolean;
}> {
  await getStripe(); // runs the pin check + populates the cache
  const v = await _verification!;
  const expected = process.env.STRIPE_EXPECTED_ACCOUNT_ID || null;
  return {
    accountId: v.accountId,
    chargesEnabled: v.chargesEnabled,
    expected,
    match: !expected || expected === v.accountId,
  };
}

/**
 * Test-only: resets the in-process verification cache. Not used in production.
 */
export function _resetStripeClientForTests(): void {
  _client = null;
  _verification = null;
}
