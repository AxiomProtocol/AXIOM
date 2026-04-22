/**
 * Unit tests for ACH webhook mapping and settlement confirmation logic.
 *
 * Tests cover:
 *  - mapAchEvent only maps settlement-confirming events to SETTLE action
 *  - Advisory/submitted/pending events produce null (no settlement)
 *  - Amount parsing / externalRef derivation
 *  - Edge cases (missing fields, unknown categories)
 */

import { describe, it, expect } from 'vitest';
import { mapAchEvent } from './achMapping';

// ── Helpers ──────────────────────────────────────────────────────────

function makeTransactionCreatedPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt_test_001',
    created_at: '2026-04-19T18:30:00Z',
    category: 'transaction.created',
    associated_object_id: 'txn_abc',
    associated_object_type: 'transaction',
    transaction: {
      id: 'txn_abc',
      amount: -50000, // negative = outbound (settled)
      currency: 'USD',
      route_type: 'ach',
      account_id: 'acct_001',
      description: 'ACH payment',
      created_at: '2026-04-19T18:30:00Z',
      source: {
        ach_transfer_id: 'acht_transfer_123',
      },
      ...overrides,
    },
  };
}

// ── Settlement-confirming events ─────────────────────────────────────

describe('mapAchEvent — settlement-confirming events', () => {
  it('maps transaction.created (ACH route) to SETTLE with correct externalRef', () => {
    const payload = makeTransactionCreatedPayload();
    const intent = mapAchEvent(payload);

    expect(intent).not.toBeNull();
    expect(intent!.action).toBe('SETTLE');
    expect(intent!.eventType).toBe('transaction.created');
    expect(intent!.txHash).toBe('acht_transfer_123');
    expect(intent!.observedAmount).toBe('500.00'); // absolute value, cents → decimal USD
    expect(intent!.observedAsset).toBe('USD');
  });

  it('maps transaction.created (wire route) to SETTLE with wire ref', () => {
    const payload = makeTransactionCreatedPayload({
      route_type: 'wire',
      source: { wire_transfer_id: 'wire_456' },
    });
    const intent = mapAchEvent(payload);

    expect(intent).not.toBeNull();
    expect(intent!.action).toBe('SETTLE');
    expect(intent!.txHash).toBe('wire_456');
  });

  it('extracts absolute amount from negative (outbound) transaction', () => {
    const payload = makeTransactionCreatedPayload({ amount: -12345 });
    const intent = mapAchEvent(payload);

    expect(intent).not.toBeNull();
    expect(intent!.observedAmount).toBe('123.45');
  });

  it('extracts absolute amount from positive (inbound) transaction', () => {
    const payload = makeTransactionCreatedPayload({ amount: 67890 });
    const intent = mapAchEvent(payload);

    expect(intent).not.toBeNull();
    expect(intent!.observedAmount).toBe('678.90');
  });
});

// ── Non-confirming / advisory events ─────────────────────────────────

describe('mapAchEvent — non-confirming events', () => {
  it('returns null for ach_transfer.submitted (advisory, not settlement-confirming)', () => {
    const payload = {
      id: 'evt_002',
      created_at: '2026-04-19T18:30:00Z',
      category: 'ach_transfer.submitted',
      ach_transfer: {
        id: 'acht_transfer_123',
        status: 'submitted',
      },
    };
    expect(mapAchEvent(payload)).toBeNull();
  });

  it('returns null for wire_transfer.submitted (advisory)', () => {
    const payload = {
      id: 'evt_003',
      created_at: '2026-04-19T18:30:00Z',
      category: 'wire_transfer.submitted',
      wire_transfer: {
        id: 'wire_456',
        status: 'submitted',
      },
    };
    expect(mapAchEvent(payload)).toBeNull();
  });

  it('returns null for unknown event categories (advisory/unmapped)', () => {
    const payload = {
      id: 'evt_004',
      created_at: '2026-04-19T18:30:00Z',
      category: 'account.updated',
    };
    expect(mapAchEvent(payload)).toBeNull();
  });

  it('returns null for empty category', () => {
    const payload = {
      id: 'evt_005',
      created_at: '2026-04-19T18:30:00Z',
    };
    expect(mapAchEvent(payload)).toBeNull();
  });
});

// ── FAIL action events ───────────────────────────────────────────────

describe('mapAchEvent — failure events', () => {
  it('maps ach_transfer.returned to FAIL with correct externalRef', () => {
    const payload = {
      id: 'evt_006',
      created_at: '2026-04-19T18:30:00Z',
      category: 'ach_transfer.returned',
      ach_transfer: {
        id: 'acht_transfer_123',
        statement_descriptor: 'Return',
      },
    };
    const intent = mapAchEvent(payload);

    expect(intent).not.toBeNull();
    expect(intent!.action).toBe('FAIL');
    expect(intent!.txHash).toBe('acht_transfer_123');
    expect(intent!.eventType).toBe('ach_transfer.returned');
  });

  it('maps wire_transfer.reversed to FAIL', () => {
    const payload = {
      id: 'evt_007',
      created_at: '2026-04-19T18:30:00Z',
      category: 'wire_transfer.reversed',
      wire_transfer: {
        id: 'wire_789',
        message_to_recipient: 'Reversed',
      },
    };
    const intent = mapAchEvent(payload);

    expect(intent).not.toBeNull();
    expect(intent!.action).toBe('FAIL');
    expect(intent!.txHash).toBe('wire_789');
  });

  it('maps declined_transaction.created to FAIL', () => {
    const payload = {
      id: 'evt_008',
      created_at: '2026-04-19T18:30:00Z',
      category: 'declined_transaction.created',
      declined_transaction: {
        id: 'dtxn_001',
        description: 'Insufficient funds',
      },
    };
    const intent = mapAchEvent(payload);

    expect(intent).not.toBeNull();
    expect(intent!.action).toBe('FAIL');
    expect(intent!.txHash).toBe('dtxn_001');
  });
});

// ── Edge cases ───────────────────────────────────────────────────────

describe('mapAchEvent — edge cases', () => {
  it('returns null for transaction.created with RTP route (not ACH/wire)', () => {
    const payload = makeTransactionCreatedPayload({
      route_type: 'real_time_payments',
      source: { rtp_transfer_id: 'rtp_001' },
    });
    expect(mapAchEvent(payload)).toBeNull();
  });

  it('returns null when transaction.created has no source ach_transfer_id', () => {
    const payload = makeTransactionCreatedPayload({
      route_type: 'ach',
      source: {},
    });
    expect(mapAchEvent(payload)).toBeNull();
  });

  it('returns null when category key nesting is missing', () => {
    const payload = {
      id: 'evt_010',
      created_at: '2026-04-19T18:30:00Z',
      category: 'ach_transfer.returned',
      // no ach_transfer key
    };
    expect(mapAchEvent(payload)).toBeNull();
  });

  it('handles zero-amount transaction correctly', () => {
    const payload = makeTransactionCreatedPayload({ amount: 0 });
    const intent = mapAchEvent(payload);

    expect(intent).not.toBeNull();
    expect(intent!.observedAmount).toBe('0.00');
  });
});
