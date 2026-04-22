/**
 * Unit tests for the settlement state machine transitions (GAP-001).
 *
 * Tests the VALID_TRANSITIONS map to verify:
 *  - SUBMITTED → SETTLED is allowed (webhook/recon confirmation path)
 *  - SUBMITTED → FAILED is allowed (returned/reversed/declined)
 *  - SETTLED → anything is rejected (terminal)
 *  - SUBMITTED → SUBMITTED is rejected (no re-submission)
 *  - Non-ACH paths are unchanged (AUTHORIZED → EXECUTING → SETTLED)
 *  - All terminal states have empty transition lists
 */

import { describe, it, expect } from 'vitest';
import { SETTLEMENT_LIFECYCLE, VALID_TRANSITIONS } from './settlement';

describe('SETTLEMENT_LIFECYCLE', () => {
  it('includes all expected statuses', () => {
    expect(SETTLEMENT_LIFECYCLE).toContain('PENDING');
    expect(SETTLEMENT_LIFECYCLE).toContain('AUTHORIZED');
    expect(SETTLEMENT_LIFECYCLE).toContain('EXECUTING');
    expect(SETTLEMENT_LIFECYCLE).toContain('SETTLED');
    expect(SETTLEMENT_LIFECYCLE).toContain('FAILED');
    expect(SETTLEMENT_LIFECYCLE).toContain('CANCELLED');
    expect(SETTLEMENT_LIFECYCLE).toContain('PENDING_OPERATOR_APPROVAL');
    expect(SETTLEMENT_LIFECYCLE).toContain('SUBMITTED');
  });

  it('has exactly 8 lifecycle states', () => {
    expect(SETTLEMENT_LIFECYCLE.length).toBe(8);
  });
});

describe('VALID_TRANSITIONS — GAP-001 confirmation path', () => {
  it('allows SUBMITTED → SETTLED (webhook/recon confirmation)', () => {
    expect(VALID_TRANSITIONS.SUBMITTED).toContain('SETTLED');
  });

  it('allows SUBMITTED → FAILED (returned/reversed/declined)', () => {
    expect(VALID_TRANSITIONS.SUBMITTED).toContain('FAILED');
  });

  it('SUBMITTED only allows SETTLED and FAILED — no re-submission or cancel', () => {
    expect(VALID_TRANSITIONS.SUBMITTED).toEqual(['SETTLED', 'FAILED']);
  });
});

describe('VALID_TRANSITIONS — non-ACH paths unchanged', () => {
  it('PENDING → AUTHORIZED or CANCELLED', () => {
    expect(VALID_TRANSITIONS.PENDING).toContain('AUTHORIZED');
    expect(VALID_TRANSITIONS.PENDING).toContain('CANCELLED');
  });

  it('AUTHORIZED → EXECUTING, PENDING_OPERATOR_APPROVAL, SUBMITTED, CANCELLED', () => {
    expect(VALID_TRANSITIONS.AUTHORIZED).toContain('EXECUTING');
    expect(VALID_TRANSITIONS.AUTHORIZED).toContain('PENDING_OPERATOR_APPROVAL');
    expect(VALID_TRANSITIONS.AUTHORIZED).toContain('SUBMITTED');
    expect(VALID_TRANSITIONS.AUTHORIZED).toContain('CANCELLED');
  });

  it('EXECUTING → SETTLED or FAILED', () => {
    expect(VALID_TRANSITIONS.EXECUTING).toContain('SETTLED');
    expect(VALID_TRANSITIONS.EXECUTING).toContain('FAILED');
  });

  it('PENDING_OPERATOR_APPROVAL → SUBMITTED or FAILED', () => {
    expect(VALID_TRANSITIONS.PENDING_OPERATOR_APPROVAL).toContain('SUBMITTED');
    expect(VALID_TRANSITIONS.PENDING_OPERATOR_APPROVAL).toContain('FAILED');
  });
});

describe('VALID_TRANSITIONS — terminal states are immutable', () => {
  it('SETTLED has no outgoing transitions', () => {
    expect(VALID_TRANSITIONS.SETTLED).toEqual([]);
  });

  it('FAILED has no outgoing transitions', () => {
    expect(VALID_TRANSITIONS.FAILED).toEqual([]);
  });

  it('CANCELLED has no outgoing transitions', () => {
    expect(VALID_TRANSITIONS.CANCELLED).toEqual([]);
  });
});
