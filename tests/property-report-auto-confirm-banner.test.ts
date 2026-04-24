/**
 * tests/property-report-auto-confirm-banner.test.ts
 *
 * Task #278 — verifies the threshold logic that decides when to render the
 * "payment confirmed after delay" banner on /property/reports/[id].
 *
 * The banner exists so buyers whose abandoned AXUSD payments were rescued by
 * the stuck-payment resolver (#248) understand the gap between checkout and
 * confirmation, instead of opening a support ticket. The same page is reused
 * for the prompt-confirm path (modal POSTs /api/property/confirm-payment
 * within seconds of the wagmi transfer), so the banner MUST be suppressed
 * for that flow — otherwise every report would carry a confusing notice.
 */

import { describe, it, expect } from 'vitest';
import {
  wasAutoConfirmedAfterDelay,
  AUTO_CONFIRM_BANNER_THRESHOLD_MS,
} from '../pages/property/reports/[id]';

const baseCreatedAt = new Date('2026-04-24T12:00:00Z');

function plus(ms: number): Date {
  return new Date(baseCreatedAt.getTime() + ms);
}

describe('wasAutoConfirmedAfterDelay (task #278)', () => {
  it('returns false when paymentConfirmedAt is missing (still pending / generating)', () => {
    expect(wasAutoConfirmedAfterDelay(baseCreatedAt, null)).toBe(false);
    expect(wasAutoConfirmedAfterDelay(baseCreatedAt, undefined)).toBe(false);
  });

  it('returns false when createdAt is missing (defensive — should never happen in prod)', () => {
    expect(wasAutoConfirmedAfterDelay(null, baseCreatedAt)).toBe(false);
    expect(wasAutoConfirmedAfterDelay(undefined, baseCreatedAt)).toBe(false);
  });

  it('returns false for the prompt-confirm path (modal POSTs within seconds)', () => {
    expect(wasAutoConfirmedAfterDelay(baseCreatedAt, plus(2_000))).toBe(false);
    expect(wasAutoConfirmedAfterDelay(baseCreatedAt, plus(45_000))).toBe(false);
  });

  it('returns false right at the boundary minus one millisecond', () => {
    expect(
      wasAutoConfirmedAfterDelay(baseCreatedAt, plus(AUTO_CONFIRM_BANNER_THRESHOLD_MS - 1)),
    ).toBe(false);
  });

  it('returns true exactly at the 5-minute threshold (inclusive)', () => {
    expect(
      wasAutoConfirmedAfterDelay(baseCreatedAt, plus(AUTO_CONFIRM_BANNER_THRESHOLD_MS)),
    ).toBe(true);
  });

  it('returns true for the resolver-rescued path (hours of delay)', () => {
    expect(wasAutoConfirmedAfterDelay(baseCreatedAt, plus(2 * 60 * 60_000))).toBe(true);
    expect(wasAutoConfirmedAfterDelay(baseCreatedAt, plus(36 * 60 * 60_000))).toBe(true);
  });

  it('accepts ISO date strings (the API serializes timestamps as JSON strings)', () => {
    expect(
      wasAutoConfirmedAfterDelay(
        baseCreatedAt.toISOString(),
        plus(20 * 60_000).toISOString(),
      ),
    ).toBe(true);
    expect(
      wasAutoConfirmedAfterDelay(
        baseCreatedAt.toISOString(),
        plus(30_000).toISOString(),
      ),
    ).toBe(false);
  });

  it('returns false for unparseable date inputs (defensive — never crash the report page)', () => {
    expect(wasAutoConfirmedAfterDelay('not-a-date', baseCreatedAt.toISOString())).toBe(false);
    expect(wasAutoConfirmedAfterDelay(baseCreatedAt.toISOString(), 'also-not-a-date')).toBe(false);
  });

  it('exports a 5-minute threshold (5 * 60 * 1000 ms)', () => {
    expect(AUTO_CONFIRM_BANNER_THRESHOLD_MS).toBe(5 * 60 * 1000);
  });
});
