/**
 * tests/buyer-emails.test.ts
 *
 * Real-render snapshot tests for the remaining buyer-facing transactional
 * emails in lib/email/resend.ts:
 *   - sendWorkbookWelcomeEmail
 *   - sendAxauEarlyAccessConfirmation
 *   - sendInboundAchNotification  (two conditional branches)
 *   - sendAxauPurchaseRequestConfirmation  (two conditional branches)
 *
 * Strategy mirrors tests/property-report-emails.test.ts:
 *   1. Stub the `resend` SDK and provide direct Resend env vars so no real
 *      network call is made and `getResendClient()` resolves to a fake sender.
 *   2. Call each email function with deterministic inputs.
 *   3. Snapshot { subject, html } captured by the fake send().
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

// Capture every email payload that would have been sent to Resend.
const sendMock = vi.fn(
  async (payload: { from: string; to: string[]; subject: string; html: string }) => ({
    id: `email-${payload.subject.slice(0, 20)}`,
  }),
);

// Stub the `resend` SDK so `new Resend(apiKey)` returns our capturing fake.
vi.mock('resend', () => {
  class FakeResend {
    emails = { send: sendMock };
  }
  return { Resend: FakeResend };
});

const originalEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
};

beforeEach(() => {
  sendMock.mockClear();
  process.env.NEXT_PUBLIC_APP_URL = 'https://axiomprotocol.app';
  process.env.RESEND_API_KEY = 'test-resend-api-key';
  process.env.RESEND_FROM_EMAIL = 'noreply@axiomprotocol.app';
});

const {
  sendWorkbookWelcomeEmail,
  sendAxauEarlyAccessConfirmation,
  sendInboundAchNotification,
  sendAxauPurchaseRequestConfirmation,
  sendEscrowCounterpartyInvitation,
} = await import('../lib/email/resend');

// ─── Shared test fixtures ────────────────────────────────────────────────────

const BUYER_EMAIL = 'buyer@example.com';
const FULL_NAME = 'Jane Doe';
const WALLET_ADDRESS = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
const SUBMISSION_ID = 'sub-abcdef1234567890';
const REQUEST_ID = 'req-abcdef1234567890';

function captured() {
  expect(sendMock).toHaveBeenCalledTimes(1);
  return sendMock.mock.calls[0][0] as {
    from: string;
    to: string[];
    subject: string;
    html: string;
  };
}

// ─── sendWorkbookWelcomeEmail ────────────────────────────────────────────────

describe('sendWorkbookWelcomeEmail — snapshot', () => {
  it('renders the all-params-present body with the checklist and CTA', async () => {
    await sendWorkbookWelcomeEmail(BUYER_EMAIL, 'Jane');

    const sent = captured();
    expect(sent.to).toEqual([BUYER_EMAIL]);
    expect(sent.from).toBe('noreply@axiomprotocol.app');
    expect(sent.subject).toMatchInlineSnapshot(
      `"Jane, here's your Heir Property Research Checklist"`,
    );
    expect(sent.html).toContain('Jane');
    expect(sent.html).toContain('https://axiomprotocol.app/workbook');
    expect(sent.html).toContain('Start Using the Workbook');
    expect(sent.html).toMatchSnapshot('workbook-welcome-email-html');
  });
});

// ─── sendAxauEarlyAccessConfirmation ────────────────────────────────────────

describe('sendAxauEarlyAccessConfirmation — snapshot', () => {
  it('renders the all-params-present body with the submission details block', async () => {
    await sendAxauEarlyAccessConfirmation({
      to: BUYER_EMAIL,
      fullName: FULL_NAME,
      walletAddress: WALLET_ADDRESS,
      submissionId: SUBMISSION_ID,
    });

    const sent = captured();
    expect(sent.to).toEqual([BUYER_EMAIL]);
    expect(sent.from).toBe('noreply@axiomprotocol.app');
    // Subject must include the short reference ID derived from submissionId.
    expect(sent.subject).toMatchInlineSnapshot(
      `"AXAU Early Access — Application Received (#SUB-ABCD)"`,
    );
    // Short wallet: 0xAbCd...f12  (first 6 + last 4)
    expect(sent.html).toContain('0xAbCd');
    expect(sent.html).toContain('f12');
    expect(sent.html).toContain(FULL_NAME);
    expect(sent.html).toContain('UNDER REVIEW');
    expect(sent.html).toContain('https://axiomprotocol.app/axau');
    expect(sent.html).toMatchSnapshot('axau-early-access-confirmation-html');
  });
});

// ─── sendInboundAchNotification ─────────────────────────────────────────────

describe('sendInboundAchNotification — snapshot', () => {
  // Use a fixed date so the formatted "Received At" string is deterministic.
  const RECEIVED_AT = new Date('2025-03-15T14:30:00.000Z');
  const BASE_PARAMS = {
    to: BUYER_EMAIL,
    fullName: FULL_NAME,
    participantRef: 'AXN-REF-001',
    amountCents: 250000, // $2,500.00
    receivedAt: RECEIVED_AT,
  };

  it('renders all rows when senderName and newBalanceCents are both present', async () => {
    await sendInboundAchNotification({
      ...BASE_PARAMS,
      senderName: 'Acme Corp Payroll',
      newBalanceCents: 375000, // $3,750.00
    });

    const sent = captured();
    expect(sent.to).toEqual([BUYER_EMAIL]);
    expect(sent.from).toBe('noreply@axiomprotocol.app');
    expect(sent.subject).toMatchInlineSnapshot(
      `"Direct Deposit Received — $2,500.00 in your Axiom Nexus Account"`,
    );
    expect(sent.html).toContain('$2,500.00');
    expect(sent.html).toContain('Acme Corp Payroll');
    expect(sent.html).toContain('$3,750.00');
    expect(sent.html).toContain('AXN-REF-001');
    expect(sent.html).toContain('https://axiomprotocol.app/banking/my-account');
    expect(sent.html).toMatchSnapshot('inbound-ach-notification-all-fields-html');
  });

  it('omits the From row when senderName is null', async () => {
    await sendInboundAchNotification({
      ...BASE_PARAMS,
      senderName: null,
      newBalanceCents: 375000,
    });

    const sent = captured();
    // "From" row should not appear in the rendered HTML.
    expect(sent.html).not.toContain('>From<');
    // Balance row should still appear.
    expect(sent.html).toContain('$3,750.00');
    expect(sent.html).toMatchSnapshot('inbound-ach-notification-no-sender-html');
  });

  it('omits the New Balance row when newBalanceCents is null', async () => {
    await sendInboundAchNotification({
      ...BASE_PARAMS,
      senderName: 'Acme Corp Payroll',
      newBalanceCents: null,
    });

    const sent = captured();
    // "New Balance" row should not appear.
    expect(sent.html).not.toContain('New Balance');
    // Sender row should still appear.
    expect(sent.html).toContain('Acme Corp Payroll');
    expect(sent.html).toMatchSnapshot('inbound-ach-notification-no-balance-html');
  });
});

// ─── sendAxauPurchaseRequestConfirmation ────────────────────────────────────

describe('sendAxauPurchaseRequestConfirmation — snapshot', () => {
  const BASE_PARAMS = {
    to: BUYER_EMAIL,
    walletAddress: WALLET_ADDRESS,
    requestId: REQUEST_ID,
    axusdAmount: '1000.00',
    axauQuoted: '0.5423',
  };

  it('renders the order summary with the XAU/USD price row when xauUsdPrice is provided', async () => {
    await sendAxauPurchaseRequestConfirmation({
      ...BASE_PARAMS,
      xauUsdPrice: '1843.27',
    });

    const sent = captured();
    expect(sent.to).toEqual([BUYER_EMAIL]);
    expect(sent.from).toBe('noreply@axiomprotocol.app');
    expect(sent.subject).toMatchInlineSnapshot(
      `"AXAU Purchase Request Received — 0.5423 AXAU (#REQ-ABCD)"`,
    );
    expect(sent.html).toContain('1000.00 AXUSD');
    expect(sent.html).toContain('0.5423 AXAU');
    expect(sent.html).toContain('$1843.27');
    expect(sent.html).toContain('PENDING FULFILLMENT');
    expect(sent.html).toContain('0xAbCd');
    expect(sent.html).toMatchSnapshot('axau-purchase-request-with-price-html');
  });

  it('omits the XAU/USD price row when xauUsdPrice is null', async () => {
    await sendAxauPurchaseRequestConfirmation({
      ...BASE_PARAMS,
      xauUsdPrice: null,
    });

    const sent = captured();
    expect(sent.subject).toMatchInlineSnapshot(
      `"AXAU Purchase Request Received — 0.5423 AXAU (#REQ-ABCD)"`,
    );
    // XAU/USD row should not appear.
    expect(sent.html).not.toContain('XAU/USD');
    // Other order fields should still be present.
    expect(sent.html).toContain('1000.00 AXUSD');
    expect(sent.html).toContain('0.5423 AXAU');
    expect(sent.html).toMatchSnapshot('axau-purchase-request-no-price-html');
  });
});

// ─── sendEscrowCounterpartyInvitation ───────────────────────────────────────

describe('sendEscrowCounterpartyInvitation — snapshot', () => {
  const ESCROW_PARAMS = {
    counterpartyName: 'Bob Smith',
    initiatorName: 'Alice Johnson',
    amountUsd: '5000.00',
    purpose: 'security_deposit',
    escrowUrl: 'https://axiomprotocol.app/escrow/abc123',
    counterpartyToken: 'cptoken-xyz-9876543210',
  };

  it('renders the all-params-present body with escrow URL, counterparty token, initiator name, and purpose label', async () => {
    await sendEscrowCounterpartyInvitation('counterparty@example.com', ESCROW_PARAMS);

    const sent = captured();
    expect(sent.to).toEqual(['counterparty@example.com']);
    expect(sent.from).toBe('noreply@axiomprotocol.app');
    expect(sent.subject).toMatchInlineSnapshot(
      `"Escrow Invitation: Alice Johnson has opened a Security Deposit escrow with you"`,
    );
    expect(sent.html).toContain('Alice Johnson');
    expect(sent.html).toContain('Security Deposit');
    expect(sent.html).toContain('https://axiomprotocol.app/escrow/abc123');
    expect(sent.html).toContain('cptoken-xyz-9876543210');
    expect(sent.html).toContain('$5,000.00');
    expect(sent.html).toMatchSnapshot('escrow-counterparty-invitation-html');
  });
});

// ─── Cleanup ─────────────────────────────────────────────────────────────────

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});
