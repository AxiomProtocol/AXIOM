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
  formatWaitDuration,
  isValidEvmTxHash,
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

describe('formatWaitDuration (task #281)', () => {
  it('returns null when either timestamp is missing (caller must suppress the line)', () => {
    expect(formatWaitDuration(null, baseCreatedAt)).toBeNull();
    expect(formatWaitDuration(baseCreatedAt, null)).toBeNull();
    expect(formatWaitDuration(undefined, undefined)).toBeNull();
  });

  it('returns null when the gap is zero or negative (clock skew, instant confirm)', () => {
    expect(formatWaitDuration(baseCreatedAt, baseCreatedAt)).toBeNull();
    expect(formatWaitDuration(baseCreatedAt, plus(-30_000))).toBeNull();
  });

  it('returns null on unparseable inputs (defensive — never crash the page)', () => {
    expect(formatWaitDuration('not-a-date', baseCreatedAt.toISOString())).toBeNull();
    expect(formatWaitDuration(baseCreatedAt.toISOString(), 'also-not-a-date')).toBeNull();
  });

  it('formats sub-hour gaps in plain minutes (with singular/plural)', () => {
    expect(formatWaitDuration(baseCreatedAt, plus(60_000))).toBe('1 minute');
    expect(formatWaitDuration(baseCreatedAt, plus(8 * 60_000))).toBe('8 minutes');
    expect(formatWaitDuration(baseCreatedAt, plus(59 * 60_000))).toBe('59 minutes');
  });

  it('formats sub-day gaps as "Xh Ym", eliding the minutes when zero', () => {
    expect(formatWaitDuration(baseCreatedAt, plus(60 * 60_000))).toBe('1h');
    expect(formatWaitDuration(baseCreatedAt, plus((3 * 60 + 12) * 60_000))).toBe('3h 12m');
    expect(formatWaitDuration(baseCreatedAt, plus(23 * 60 * 60_000))).toBe('23h');
    expect(formatWaitDuration(baseCreatedAt, plus((23 * 60 + 59) * 60_000))).toBe('23h 59m');
  });

  it('formats multi-day gaps as "Xd Yh", eliding the hours when zero', () => {
    expect(formatWaitDuration(baseCreatedAt, plus(24 * 60 * 60_000))).toBe('1d');
    expect(formatWaitDuration(baseCreatedAt, plus(28 * 60 * 60_000))).toBe('1d 4h');
    expect(formatWaitDuration(baseCreatedAt, plus(52 * 60 * 60_000))).toBe('2d 4h');
    expect(formatWaitDuration(baseCreatedAt, plus(72 * 60 * 60_000))).toBe('3d');
  });

  it('floors fractional minutes/hours/days (no half-units rendered)', () => {
    // 90s → 1 minute (not "1.5 minutes")
    expect(formatWaitDuration(baseCreatedAt, plus(90 * 1000))).toBe('1 minute');
    // 1h 59m 59s → "1h 59m" (not bumped up to 2h)
    expect(formatWaitDuration(baseCreatedAt, plus((60 + 59) * 60_000 + 59_000))).toBe('1h 59m');
  });

  it('accepts ISO strings on both sides (matches the JSON shape from the API)', () => {
    expect(
      formatWaitDuration(
        baseCreatedAt.toISOString(),
        plus((6 * 60 + 30) * 60_000).toISOString(),
      ),
    ).toBe('6h 30m');
  });
});

describe('isValidEvmTxHash (task #281 — guards the Arbiscan link)', () => {
  // Base of a real-shape 32-byte tx hash (66 chars total: 0x + 64 hex).
  const VALID_HASH =
    '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

  it('accepts a well-formed 0x + 64 hex char tx hash (lowercase)', () => {
    expect(isValidEvmTxHash(VALID_HASH)).toBe(true);
  });

  it('accepts mixed/upper-case hex (Arbiscan accepts either)', () => {
    expect(isValidEvmTxHash('0x' + 'A'.repeat(64))).toBe(true);
    expect(isValidEvmTxHash('0x' + 'aBcDeF'.repeat(10) + 'aBcD')).toBe(true);
  });

  it('rejects an empty string, null, or undefined', () => {
    expect(isValidEvmTxHash('')).toBe(false);
    expect(isValidEvmTxHash(null)).toBe(false);
    expect(isValidEvmTxHash(undefined)).toBe(false);
  });

  it('rejects non-string inputs (numbers, objects, booleans)', () => {
    expect(isValidEvmTxHash(0xdeadbeef)).toBe(false);
    expect(isValidEvmTxHash({ hash: VALID_HASH })).toBe(false);
    expect(isValidEvmTxHash(true)).toBe(false);
  });

  it('rejects a hash missing the 0x prefix', () => {
    expect(isValidEvmTxHash(VALID_HASH.slice(2))).toBe(false);
  });

  it('rejects a truncated hash (the actual prod failure mode)', () => {
    expect(isValidEvmTxHash('0xabc123')).toBe(false);
  });

  it('rejects an over-length hash', () => {
    expect(isValidEvmTxHash(VALID_HASH + '00')).toBe(false);
  });

  it('rejects a hash containing non-hex characters', () => {
    expect(isValidEvmTxHash('0x' + 'g'.repeat(64))).toBe(false);
    expect(isValidEvmTxHash('0x' + 'z'.repeat(64))).toBe(false);
    // Whitespace must also be rejected — Arbiscan would 404.
    expect(isValidEvmTxHash(`  ${VALID_HASH}  `)).toBe(false);
  });

  it('rejects a hash with the wrong prefix (0X uppercase, no 0)', () => {
    expect(isValidEvmTxHash('0X' + 'a'.repeat(64))).toBe(false);
    expect(isValidEvmTxHash('x' + 'a'.repeat(64))).toBe(false);
  });
});
