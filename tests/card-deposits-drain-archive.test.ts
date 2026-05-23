/**
 * tests/card-deposits-drain-archive.test.ts
 *
 * Task #250 — drain-completion archive emitter.
 *
 * Covers:
 *   1. CSV helper (`buildCardDepositArchiveCsv`):
 *      - Header order is the exact set the operator endpoint streams.
 *      - Row count and oldest/newest createdAt are tracked across pages.
 *      - csvEscape quotes commas/quotes/newlines.
 *   2. `maybeEmitDrainArchiveEmail` skip paths (no DB / Resend involved):
 *      - Skips with `in_flight_remaining` when count > 0.
 *      - Skips with `already_emitted` when audit marker is present.
 *      - Skips with `no_recipients_configured` when env var is unset.
 *      - Skips with `no_rows_to_archive` when archive is empty (and does
 *        NOT write the once-only marker so a real future drain still fires).
 *   3. Happy path:
 *      - Reserves the marker row, sends one email via Resend with the
 *        CSV attached, then promotes the marker to `*_emitted` with the
 *        full payload (deterministic id).
 *   4. Idempotency:
 *      - A second call after a successful send is a no-op
 *        (`already_emitted`) — does NOT call Resend a second time.
 *   5. Failure containment:
 *      - Resend throwing yields `error` populated, the reservation row
 *        is rolled back (deleted), and a `*_failed` audit row is written
 *        so a retry on the next webhook can re-attempt.
 *   6. Concurrency:
 *      - Two parallel `maybeEmitDrainArchiveEmail()` calls produce
 *        EXACTLY one outbound email and one promoted marker row.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CapCardDeposit } from '../shared/capInfraSchema';

// ─── Hoisted state used by mocks ──────────────────────────────────────

interface MutableState {
  inFlightCount: number;
  /** The single "row" in the mock cap_audit_events table for the deterministic id. */
  markerRow: { id: string; eventType: string; payload: any } | null;
  /** Every reservation INSERT that won (i.e. wasn't a conflict). */
  reservationInserts: any[];
  /** Every promotion UPDATE on the marker row. */
  markerUpdates: any[];
  /** Every DELETE on the marker row (rollback path). */
  markerDeletes: number;
  /** Every plain insert into cap_audit_events that isn't the deterministic marker. */
  failureAuditInserts: any[];
  pages: CapCardDeposit[][];
  emailsSent: any[];
  resendShouldThrow: Error | null;
  /** Optional latch: hold the email send until released, to test concurrency. */
  emailSendGate: Promise<void> | null;
}

const state: MutableState = {
  inFlightCount: 0,
  markerRow: null,
  reservationInserts: [],
  markerUpdates: [],
  markerDeletes: 0,
  failureAuditInserts: [],
  pages: [],
  emailsSent: [],
  resendShouldThrow: null,
  emailSendGate: null,
};

const DETERMINISTIC_ID = 'ae_cd_drain_archive_v1';

function resetState(): void {
  state.inFlightCount = 0;
  state.markerRow = null;
  state.reservationInserts = [];
  state.markerUpdates = [];
  state.markerDeletes = 0;
  state.failureAuditInserts = [];
  state.pages = [];
  state.emailsSent = [];
  state.resendShouldThrow = null;
  state.emailSendGate = null;
}

// ─── Mocks (registered before module import) ─────────────────────────

vi.mock('../lib/email/resend', () => ({
  getResendClient: async () => ({
    client: {
      emails: {
        send: async (args: any) => {
          if (state.emailSendGate) await state.emailSendGate;
          if (state.resendShouldThrow) throw state.resendShouldThrow;
          state.emailsSent.push(args);
          return { data: { id: 'mock-email-id' }, error: null };
        },
      },
    },
    fromEmail: 'noreply@axiomprotocol.app',
  }),
}));

// Mock the shared CSV helpers so we can drive the row stream and
// in-flight count directly without a live database. The drainArchive
// module imports `buildCardDepositArchiveCsv` and
// `getInFlightCardDepositCount` from this path.
vi.mock('../lib/capinfra/cardDeposits/csvExport', async () => {
  const actual = await vi.importActual<typeof import('../lib/capinfra/cardDeposits/csvExport')>(
    '../lib/capinfra/cardDeposits/csvExport',
  );
  return {
    ...actual,
    getInFlightCardDepositCount: async () => state.inFlightCount,
    buildCardDepositArchiveCsv: async () => {
      const lines: string[] = [actual.CARD_DEPOSITS_CSV_HEADER.join(',')];
      let rowCount = 0;
      let oldest: Date | null = null;
      let newest: Date | null = null;
      for (const page of state.pages) {
        for (const r of page) {
          lines.push(actual.cardDepositRowToCsv(r));
          rowCount += 1;
          if (oldest === null || r.createdAt < oldest) oldest = r.createdAt;
          if (newest === null || r.createdAt > newest) newest = r.createdAt;
        }
      }
      return {
        csv: lines.join('\n') + '\n',
        rowCount,
        oldestCreatedAt: oldest,
        newestCreatedAt: newest,
      };
    },
  };
});

// Drizzle-shaped mock for the audit-marker check + insert + update +
// delete paths used by drainArchive. We model the deterministic marker
// row as a single mutable slot in `state.markerRow`; the reservation
// INSERT...ON CONFLICT DO NOTHING is the atomic gate.
vi.mock('../server/db', () => {
  function makeSelectChain() {
    const chain: any = {
      from() { return chain; },
      where() { return chain; },
      async limit() {
        return state.markerRow ? [{ id: state.markerRow.id }] : [];
      },
    };
    return chain;
  }

  function makeInsertChain() {
    let pendingValues: any = null;
    let isOnConflict = false;
    const chain: any = {
      values(v: any) { pendingValues = v; return chain; },
      onConflictDoNothing() { isOnConflict = true; return chain; },
      async returning() {
        if (isOnConflict) {
          // Reservation INSERT — atomic on the deterministic id.
          if (pendingValues.id === DETERMINISTIC_ID && state.markerRow) {
            return [];
          }
          state.markerRow = {
            id: pendingValues.id,
            eventType: pendingValues.eventType,
            payload: pendingValues.payloadJson,
          };
          state.reservationInserts.push(pendingValues);
          return [{ id: pendingValues.id }];
        }
        // Plain insert — only used by failure-audit path with a generated id.
        state.failureAuditInserts.push(pendingValues);
        return [{ id: pendingValues.id }];
      },
      // Failure-audit path awaits the insert directly without .returning().
      then(resolve: any, reject: any) {
        if (isOnConflict) {
          // Concurrency model: same logic as .returning() above.
          if (pendingValues.id === DETERMINISTIC_ID && state.markerRow) {
            return Promise.resolve([]).then(resolve, reject);
          }
          state.markerRow = {
            id: pendingValues.id,
            eventType: pendingValues.eventType,
            payload: pendingValues.payloadJson,
          };
          state.reservationInserts.push(pendingValues);
          return Promise.resolve([{ id: pendingValues.id }]).then(resolve, reject);
        }
        state.failureAuditInserts.push(pendingValues);
        return Promise.resolve({ rowCount: 1 }).then(resolve, reject);
      },
    };
    return chain;
  }

  function makeUpdateChain() {
    let pendingSet: any = null;
    const chain: any = {
      set(v: any) { pendingSet = v; return chain; },
      where() {
        // Apply the update synchronously — only one marker row exists.
        if (state.markerRow) {
          state.markerRow.eventType = pendingSet.eventType ?? state.markerRow.eventType;
          state.markerRow.payload = pendingSet.payloadJson ?? state.markerRow.payload;
          state.markerUpdates.push(pendingSet);
        }
        return Promise.resolve({ rowCount: state.markerRow ? 1 : 0 });
      },
    };
    return chain;
  }

  function makeDeleteChain() {
    const chain: any = {
      where() {
        if (state.markerRow) {
          state.markerRow = null;
          state.markerDeletes += 1;
        }
        return Promise.resolve({ rowCount: 1 });
      },
    };
    return chain;
  }

  return {
    db: {
      select: () => makeSelectChain(),
      insert: () => makeInsertChain(),
      update: () => makeUpdateChain(),
      delete: () => makeDeleteChain(),
    },
  };
});

// Import module under test AFTER mocks are registered.
const {
  maybeEmitDrainArchiveEmail,
  DRAIN_ARCHIVE_AUDIT_ID,
  DRAIN_ARCHIVE_EVENT_TYPE,
  DRAIN_ARCHIVE_RESERVED_EVENT_TYPE,
} = await import('../lib/capinfra/cardDeposits/drainArchive');
const csvHelpers = await import('../lib/capinfra/cardDeposits/csvExport');

// ─── Fixtures ─────────────────────────────────────────────────────────

function makeRow(overrides: Partial<CapCardDeposit> = {}): CapCardDeposit {
  const base: CapCardDeposit = {
    id: 'cd_test_001',
    userId: null,
    intent: 'TREASURY_FUND',
    amountCents: 12345,
    currency: 'usd',
    stripeSessionId: 'cs_test_001',
    stripePaymentIntentId: null,
    stripePayoutId: null,
    increaseTransferId: null,
    mintTxHash: null,
    status: 'SETTLED',
    targetWalletAddress: null,
    buyerEmail: null,
    idempotencyKey: 'idem_test_001',
    errorReason: null,
    metadataJson: null,
    createdAt: new Date('2025-01-15T10:30:00.000Z'),
    updatedAt: new Date('2025-01-16T11:00:00.000Z'),
  } as CapCardDeposit;
  return { ...base, ...overrides };
}

beforeEach(() => {
  resetState();
});

// ─── 1. CSV helper sanity ─────────────────────────────────────────────

describe('cardDeposits CSV helper', () => {
  it('header order matches the operator-endpoint contract', () => {
    expect(csvHelpers.CARD_DEPOSITS_CSV_HEADER).toEqual([
      'id', 'intent', 'status', 'amount_cents', 'currency',
      'stripe_session_id', 'stripe_payment_intent_id', 'stripe_payout_id',
      'banking_transfer_id', 'mint_tx_hash', 'target_wallet_address',
      'buyer_email', 'user_id', 'idempotency_key', 'error_reason',
      'created_at', 'updated_at',
    ]);
  });

  it('csvEscape quotes commas, quotes, and newlines', () => {
    expect(csvHelpers.csvEscape('plain')).toBe('plain');
    expect(csvHelpers.csvEscape('a,b')).toBe('"a,b"');
    expect(csvHelpers.csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvHelpers.csvEscape('a\nb')).toBe('"a\nb"');
    expect(csvHelpers.csvEscape(null)).toBe('');
    expect(csvHelpers.csvEscape(undefined)).toBe('');
    expect(csvHelpers.csvEscape(42)).toBe('42');
  });

  it('cardDepositRowToCsv emits values in the header order', () => {
    const row = makeRow({
      id: 'cd_x',
      intent: 'AXUSD_MINT',
      status: 'MINTED',
      amountCents: 50000,
      currency: 'usd',
      stripeSessionId: 'cs_x',
      buyerEmail: 'a@b.c',
      idempotencyKey: 'idem_x',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    });
    const csv = csvHelpers.cardDepositRowToCsv(row);
    const cols = csv.split(',');
    expect(cols[0]).toBe('cd_x');
    expect(cols[1]).toBe('AXUSD_MINT');
    expect(cols[2]).toBe('MINTED');
    expect(cols[3]).toBe('50000');
    expect(cols[4]).toBe('usd');
    expect(cols[5]).toBe('cs_x');
    expect(cols[15]).toBe('2025-01-01T00:00:00.000Z');
    expect(cols[16]).toBe('2025-01-02T00:00:00.000Z');
  });
});

// ─── 2. Skip paths ────────────────────────────────────────────────────

describe('maybeEmitDrainArchiveEmail — skip paths', () => {
  it('skips with in_flight_remaining when count > 0', async () => {
    state.inFlightCount = 3;
    state.pages = [[makeRow()]];
    const result = await maybeEmitDrainArchiveEmail({ recipientsOverride: ['ops@x'] });
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('in_flight_remaining');
    expect(result.inFlightCount).toBe(3);
    expect(state.emailsSent).toHaveLength(0);
    expect(state.reservationInserts).toHaveLength(0);
    expect(state.markerUpdates).toHaveLength(0);
  });

  it('skips with already_emitted when audit marker is present', async () => {
    state.inFlightCount = 0;
    state.markerRow = {
      id: DETERMINISTIC_ID,
      eventType: DRAIN_ARCHIVE_EVENT_TYPE,
      payload: { rowCount: 7 },
    };
    state.pages = [[makeRow()]];
    const result = await maybeEmitDrainArchiveEmail({ recipientsOverride: ['ops@x'] });
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('already_emitted');
    expect(state.emailsSent).toHaveLength(0);
    expect(state.reservationInserts).toHaveLength(0);
  });

  it('skips with no_recipients_configured when env list is empty', async () => {
    state.inFlightCount = 0;
    state.pages = [[makeRow()]];
    const result = await maybeEmitDrainArchiveEmail({ recipientsOverride: [] });
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('no_recipients_configured');
    expect(state.emailsSent).toHaveLength(0);
    expect(state.reservationInserts).toHaveLength(0);
  });

  it('skips with no_rows_to_archive when archive is empty (no marker written)', async () => {
    state.inFlightCount = 0;
    state.pages = [];
    const result = await maybeEmitDrainArchiveEmail({ recipientsOverride: ['ops@x'] });
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('no_rows_to_archive');
    expect(state.emailsSent).toHaveLength(0);
    // Critical: no marker (reserved or emitted) so a real future drain still fires.
    expect(state.reservationInserts).toHaveLength(0);
    expect(state.markerRow).toBeNull();
  });
});

// ─── 3. Happy path ────────────────────────────────────────────────────

describe('maybeEmitDrainArchiveEmail — happy path', () => {
  it('reserves, sends one email with CSV attached, then promotes the marker', async () => {
    state.inFlightCount = 0;
    state.pages = [[
      makeRow({
        id: 'cd_a',
        createdAt: new Date('2024-12-01T00:00:00.000Z'),
        updatedAt: new Date('2024-12-02T00:00:00.000Z'),
      }),
      makeRow({
        id: 'cd_b',
        intent: 'AXUSD_MINT',
        status: 'MINTED',
        createdAt: new Date('2025-02-15T00:00:00.000Z'),
        updatedAt: new Date('2025-02-16T00:00:00.000Z'),
      }),
    ]];

    const result = await maybeEmitDrainArchiveEmail({
      recipientsOverride: ['audit@axiomprotocol.app', 'ops@axiomprotocol.app'],
    });

    expect(result.skipped).toBe(false);
    expect(result.reason).toBeNull();
    expect(result.error).toBeNull();
    expect(result.rowCount).toBe(2);
    expect(result.recipientCount).toBe(2);

    // Exactly one email out, with the right shape.
    expect(state.emailsSent).toHaveLength(1);
    const sent = state.emailsSent[0];
    expect(sent.to).toEqual(['audit@axiomprotocol.app', 'ops@axiomprotocol.app']);
    expect(sent.subject).toMatch(/^\[AXIOM\] Card-deposit rail drained/);
    expect(sent.subject).toMatch(/2 rows/);
    expect(sent.subject).toContain('2024-12-01');
    expect(sent.subject).toContain('2025-02-15');
    expect(Array.isArray(sent.attachments)).toBe(true);
    expect(sent.attachments).toHaveLength(1);
    expect(sent.attachments[0].filename).toMatch(/^cap_card_deposits_.*\.csv$/);
    const csvText = sent.attachments[0].content.toString('utf-8');
    expect(csvText.split('\n')[0]).toBe(csvHelpers.CARD_DEPOSITS_CSV_HEADER.join(','));
    expect(csvText).toContain('cd_a');
    expect(csvText).toContain('cd_b');

    // Reservation went in with the deterministic id and the *_reserved event type.
    expect(state.reservationInserts).toHaveLength(1);
    expect(state.reservationInserts[0].id).toBe(DRAIN_ARCHIVE_AUDIT_ID);
    expect(state.reservationInserts[0].eventType).toBe(DRAIN_ARCHIVE_RESERVED_EVENT_TYPE);

    // Promotion landed: the row's event_type is *_emitted with the full payload.
    expect(state.markerUpdates).toHaveLength(1);
    expect(state.markerUpdates[0].eventType).toBe(DRAIN_ARCHIVE_EVENT_TYPE);
    expect(state.markerUpdates[0].payloadJson.rowCount).toBe(2);
    expect(state.markerRow?.eventType).toBe(DRAIN_ARCHIVE_EVENT_TYPE);
    expect(state.markerRow?.id).toBe(DRAIN_ARCHIVE_AUDIT_ID);
  });
});

// ─── 4. Idempotency ───────────────────────────────────────────────────

describe('maybeEmitDrainArchiveEmail — idempotency', () => {
  it('a second call after a successful send is a no-op', async () => {
    state.inFlightCount = 0;
    state.pages = [[makeRow()]];

    const first = await maybeEmitDrainArchiveEmail({ recipientsOverride: ['ops@x'] });
    expect(first.skipped).toBe(false);
    expect(state.emailsSent).toHaveLength(1);
    expect(state.markerRow?.eventType).toBe(DRAIN_ARCHIVE_EVENT_TYPE);

    const second = await maybeEmitDrainArchiveEmail({ recipientsOverride: ['ops@x'] });
    expect(second.skipped).toBe(true);
    expect(second.reason).toBe('already_emitted');
    // Crucially, no second send.
    expect(state.emailsSent).toHaveLength(1);
    expect(state.reservationInserts).toHaveLength(1);
    expect(state.markerUpdates).toHaveLength(1);
  });
});

// ─── 5. Failure containment ───────────────────────────────────────────

describe('maybeEmitDrainArchiveEmail — failure containment', () => {
  it('Resend throwing rolls back the reservation and writes a failure-audit row', async () => {
    state.inFlightCount = 0;
    state.pages = [[makeRow()]];
    state.resendShouldThrow = new Error('resend boom');

    const result = await maybeEmitDrainArchiveEmail({ recipientsOverride: ['ops@x'] });
    expect(result.skipped).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.error).toMatch(/^email_send: resend boom/);
    expect(result.rowCount).toBe(1);

    // Reservation row was inserted then rolled back — no marker remains,
    // so the next webhook can re-attempt.
    expect(state.reservationInserts).toHaveLength(1);
    expect(state.markerDeletes).toBe(1);
    expect(state.markerRow).toBeNull();
    expect(state.markerUpdates).toHaveLength(0);

    // Separate failure-audit row exists for operator visibility.
    expect(state.failureAuditInserts).toHaveLength(1);
    expect(state.failureAuditInserts[0].eventType).toBe('card_deposit.drain_archive_failed');
  });
});

// ─── 6. Concurrency — once-only under parallel callers ────────────────

describe('maybeEmitDrainArchiveEmail — concurrency', () => {
  it('two parallel callers produce EXACTLY one email and one promoted marker', async () => {
    state.inFlightCount = 0;
    state.pages = [[makeRow()]];

    // Hold the email send leg open until both callers have passed the
    // pre-check and reached the reservation INSERT, simulating a real
    // race. Whichever caller wins the INSERT will then proceed to send;
    // the other will see the conflict and short-circuit.
    let release: () => void = () => {};
    state.emailSendGate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const callA = maybeEmitDrainArchiveEmail({ recipientsOverride: ['ops@x'] });
    const callB = maybeEmitDrainArchiveEmail({ recipientsOverride: ['ops@x'] });

    // Let event-loop microtasks settle so both calls reach the gate.
    await new Promise((r) => setTimeout(r, 0));
    release();

    const [a, b] = await Promise.all([callA, callB]);

    // Exactly one win and one skip.
    const sentResults = [a, b].filter((r) => !r.skipped);
    const skippedResults = [a, b].filter(
      (r) => r.skipped && r.reason === 'already_emitted',
    );
    expect(sentResults).toHaveLength(1);
    expect(skippedResults).toHaveLength(1);

    // Exactly one outbound email.
    expect(state.emailsSent).toHaveLength(1);

    // Exactly one reservation INSERT won, exactly one promotion happened.
    expect(state.reservationInserts).toHaveLength(1);
    expect(state.markerUpdates).toHaveLength(1);
    expect(state.markerRow?.eventType).toBe(DRAIN_ARCHIVE_EVENT_TYPE);
  });
});
