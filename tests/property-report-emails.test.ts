/**
 * tests/property-report-emails.test.ts
 *
 * Real-render snapshot tests for the buyer-notification emails added in
 * task #275 (`sendPropertyReportReadyEmail`, `sendPropertyReportExpiredEmail`).
 *
 * The resolver tests in tests/stuck-property-payment-resolver.test.ts only
 * verify the call args; nothing locks in the actual rendered HTML. A
 * snapshot test catches regressions like:
 *   - Broken Arbiscan link template (wrong host, wrong tx path)
 *   - Dropped CTA button or report link
 *   - Color/branding changes (e.g. someone swaps the navy header)
 *   - Missing reportId / address in the subject or receipt block
 *
 * Strategy:
 *   1. Stub the `resend` package + the Replit connector fetch so
 *      `getResendClient()` resolves without any real network round-trip and
 *      hands back a fake sender we can inspect.
 *   2. Call each email function with deterministic inputs.
 *   3. Snapshot { subject, html } as captured by the fake send().
 *   4. The ready email gets two snapshots — Arbitrum One and Sepolia — so
 *      the explorer link variant produced by `getArbiscanTxUrl` is locked
 *      in for both production and the testnet path.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

// Capture every email payload that would have been sent to Resend.
const sendMock = vi.fn(
  async (payload: { from: string; to: string[]; subject: string; html: string }) => ({
    id: `email-${payload.subject.slice(0, 20)}`,
  }),
);

// Stub the `resend` SDK so `new Resend(apiKey)` returns our capturing fake.
// This is what `getResendClient()` constructs internally — by intercepting
// it here we avoid mocking `lib/email/resend` itself (vi.mock of the module
// under test would not redirect intra-module references to its own helper).
vi.mock('resend', () => {
  class FakeResend {
    emails = { send: sendMock };
  }
  return { Resend: FakeResend };
});

// `getResendClient()` calls `getCredentials()` which fetches the Resend
// connector secret from the Replit connectors API. Stub global fetch so
// that lookup resolves to a deterministic api_key + from_email without
// hitting the network.
const originalFetch = globalThis.fetch;
const originalEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  REPLIT_CONNECTORS_HOSTNAME: process.env.REPLIT_CONNECTORS_HOSTNAME,
  REPL_IDENTITY: process.env.REPL_IDENTITY,
};

beforeEach(() => {
  sendMock.mockClear();
  process.env.NEXT_PUBLIC_APP_URL = 'https://axiomprotocol.app';
  // Required by getCredentials() to even attempt the lookup.
  process.env.REPLIT_CONNECTORS_HOSTNAME = 'connectors.replit.test';
  process.env.REPL_IDENTITY = 'test-identity';
  globalThis.fetch = vi.fn(async () =>
    new Response(
      JSON.stringify({
        items: [
          {
            settings: {
              api_key: 'test-resend-api-key',
              from_email: 'noreply@axiomprotocol.app',
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  ) as unknown as typeof fetch;
});

const {
  sendPropertyReportReadyEmail,
  sendPropertyReportExpiredEmail,
} = await import('../lib/email/resend');

const { getArbiscanTxUrl, ARBITRUM_ONE_CHAIN_ID, ARBITRUM_SEPOLIA_CHAIN_ID } =
  await import('../lib/property/explorerLinks');

const BUYER_EMAIL = 'buyer@example.com';
const REPORT_ID = 'rep-abcdef1234567890';
const ADDRESS = '742 Evergreen Terrace, Springfield IL';
const TX_HASH = '0x' + 'a'.repeat(64);
const AMOUNT = '4.99';

function captured() {
  expect(sendMock).toHaveBeenCalledTimes(1);
  return sendMock.mock.calls[0][0] as {
    from: string;
    to: string[];
    subject: string;
    html: string;
  };
}

describe('sendPropertyReportReadyEmail — snapshot', () => {
  it('renders the all-params-present body with the Arbitrum One explorer link', async () => {
    await sendPropertyReportReadyEmail({
      to: BUYER_EMAIL,
      reportId: REPORT_ID,
      address: ADDRESS,
      txHash: TX_HASH,
      arbiscanUrl: getArbiscanTxUrl(ARBITRUM_ONE_CHAIN_ID, TX_HASH),
      amountAxusd: AMOUNT,
    });

    const sent = captured();
    expect(sent.to).toEqual([BUYER_EMAIL]);
    expect(sent.from).toBe('noreply@axiomprotocol.app');
    // Subject must carry the short reportId so the buyer's inbox shows a
    // unique, searchable identifier per receipt.
    expect(sent.subject).toMatchInlineSnapshot(
      `"Your AXIOM property report is ready (#REP-ABCD)"`,
    );
    // Quick semantic sanity checks before the full-HTML snapshot — these
    // make a regression in a key field obvious in the test output.
    expect(sent.html).toContain('https://arbiscan.io/tx/' + TX_HASH);
    expect(sent.html).toContain(
      'https://axiomprotocol.app/property/reports/' + REPORT_ID,
    );
    expect(sent.html).toContain(ADDRESS);
    expect(sent.html).toContain(`${AMOUNT} AXUSD`);
    expect(sent.html).toContain('View Report');
    // Full HTML snapshot — locks in the entire template (header colors,
    // copy, CTA, footer) so any accidental change forces an explicit
    // snapshot update.
    expect(sent.html).toMatchSnapshot('ready-email-html-arbitrum-one');
  });

  it('renders the Sepolia explorer link variant when the testnet chainId is used', async () => {
    await sendPropertyReportReadyEmail({
      to: BUYER_EMAIL,
      reportId: REPORT_ID,
      address: ADDRESS,
      txHash: TX_HASH,
      arbiscanUrl: getArbiscanTxUrl(ARBITRUM_SEPOLIA_CHAIN_ID, TX_HASH),
      amountAxusd: AMOUNT,
    });

    const sent = captured();
    // Subject is chain-agnostic — same format as production.
    expect(sent.subject).toBe('Your AXIOM property report is ready (#REP-ABCD)');
    // Sepolia explorer must point at sepolia.arbiscan.io (NOT arbiscan.io).
    expect(sent.html).toContain('https://sepolia.arbiscan.io/tx/' + TX_HASH);
    expect(sent.html).not.toMatch(/href="https:\/\/arbiscan\.io\/tx\//);
    expect(sent.html).toMatchSnapshot('ready-email-html-arbitrum-sepolia');
  });
});

describe('sendPropertyReportExpiredEmail — snapshot', () => {
  it('renders the all-params-present body with the retry CTA and support link', async () => {
    await sendPropertyReportExpiredEmail({
      to: BUYER_EMAIL,
      reportId: REPORT_ID,
      address: ADDRESS,
    });

    const sent = captured();
    expect(sent.to).toEqual([BUYER_EMAIL]);
    expect(sent.from).toBe('noreply@axiomprotocol.app');
    expect(sent.subject).toMatchInlineSnapshot(
      `"Your AXIOM property report request expired (#REP-ABCD)"`,
    );
    expect(sent.html).toContain('https://axiomprotocol.app/property');
    expect(sent.html).toContain('https://axiomprotocol.app/contact');
    expect(sent.html).toContain(ADDRESS);
    expect(sent.html).toContain('Request a New Report');
    expect(sent.html).toContain('EXPIRED');
    expect(sent.html).toMatchSnapshot('expired-email-html');
  });
});

// Restore real fetch + env after the suite to be a good neighbor in shared
// vitest workers (avoids leaking the test-identity / fake hostname into
// other suites that run in the same process).
afterAll(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});
