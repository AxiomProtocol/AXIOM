// @vitest-environment jsdom
/**
 * Tests for the PAXG Reserve Contribution auto-refresh behaviour on /assets/dashboard.
 *
 * Covers:
 *   - Client-side polling runs immediately on mount and shows the "Last updated:" label
 *   - After 60 seconds the section re-fetches and updates the spot-price card without a
 *     page reload (confirming the setInterval hook is wired correctly)
 *   - A network error during a subsequent poll keeps the previous data visible and shows
 *     a poll-error note
 *
 * Timer strategy
 * ──────────────
 * Tests that only need the initial poll (no setInterval) use REAL timers so that
 * RTL's `waitFor` (which uses setInterval internally) can retry normally.
 *
 * Tests that need to advance past the 60-second setInterval use FAKE timers and
 * `act + vi.advanceTimersByTimeAsync` to flush async work, avoiding the two failure
 * modes seen with runAllTimersAsync:
 *   1. Infinite-loop guard (setInterval reschedules itself indefinitely)
 *   2. waitFor deadlock (RTL's own retries never fire when time is frozen)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';

// ── Module mocks (hoisted by vitest before any dynamic import) ────────────────

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('../components/design-law', () => ({
  DesignLawLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SectionHeading: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  CollateralClassBadge: ({ value }: { value: string }) => <span>{value}</span>,
}));

vi.mock('../components/visual', () => ({
  PageVisualSuite: () => null,
}));

vi.mock('../lib/db', () => ({
  db: { execute: vi.fn(), query: vi.fn() },
}));

vi.mock('../lib/reserves/phase3/treasuryNAVOracle', () => ({
  getTreasuryNAVOracle: vi.fn(),
}));

vi.mock('../lib/reserves/phase3/feeds/bitgoAttestationFetcher', () => ({
  fetchBitGoAttestation: vi.fn(),
}));

vi.mock('../lib/reserves/phase3/navPollingService', () => ({
  getLastPollSummary: vi.fn(() => null),
}));

vi.mock('../lib/assets/externalAssetService', () => ({
  listSupportedAssets: vi.fn(() => []),
  getAssetMetadata: vi.fn(() => ({ name: 'test', category: 'GOLD', unit: 'oz' })),
  getAssetUsdValue: vi.fn(async () => ({ unitPriceUsd: null, oracleSource: 'test' })),
  SUPPORTED_SYMBOLS: [] as string[],
}));

vi.mock('../lib/portfolio/realAssetsPortfolio', () => ({
  _internal: {
    getAxauUsdPerToken: vi.fn(async () => ({ usd: null, source: 'test' })),
  },
}));

const { default: Dashboard } = await import('../pages/assets/dashboard');

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNavResponse(grossNavPerToken: number, fetchedAt: string): Response {
  return new Response(
    JSON.stringify({
      fetchedAt,
      observation: {
        grossNavPerToken,
        sourceName: 'Chainlink XAU/USD',
        sourceUrl: null,
        timestamp: fetchedAt,
        confidenceScore: 87,
        freshnessState: 'FRESH',
        liveAttestationStatus: null,
        isStale: false,
        isUsable: true,
        unusableReason: null,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

/**
 * Minimal PageProps — all fields required by the Dashboard component.
 * paxgNav is null so the initial SSR value is absent and any visible value
 * can only come from the client-side pollPaxgNav hook.
 */
const BASE_PROPS = {
  assets: [],
  spots: [],
  axauSpot: { usdPerTroyOz: null, source: 'test' },
  paxgNav: null,
  paxgAttestation: null,
  paxgLastPoll: null,
  paxgAdmission: null,
  fetchedAt: '2026-01-01T00:00:00.000Z',
};

const ORIGINAL_FETCH = globalThis.fetch;

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — initial poll (real timers, waitFor works normally)
// ─────────────────────────────────────────────────────────────────────────────

describe('PAXG auto-refresh — initial poll runs on mount', () => {
  afterEach(() => {
    cleanup();
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it('shows the "Last updated:" label after the first client-side fetch completes', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/axusd/oracles/nav')) {
        return makeNavResponse(3200, '2026-01-01T00:00:01.000Z');
      }
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;

    render(<Dashboard {...(BASE_PROPS as Parameters<typeof Dashboard>[0])} />);

    await waitFor(
      () => {
        expect(screen.getByText(/Last updated:/)).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it('displays the grossNavPerToken value from the fetched observation in the spot-price card', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/axusd/oracles/nav')) {
        return makeNavResponse(3200, '2026-01-01T00:00:01.000Z');
      }
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;

    render(<Dashboard {...(BASE_PROPS as Parameters<typeof Dashboard>[0])} />);

    // fmtUsd(3200, { maximumFractionDigits: 2 }) → "$3,200" (no .00 — minimumFractionDigits unset)
    await waitFor(
      () => {
        expect(screen.getByText(/\$3,200/)).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — 60-second interval (fake timers + act pattern)
//
// Strategy:
//   1. vi.useFakeTimers() so we control setInterval.
//   2. After render, flush the initial mount with act+advanceTimersByTimeAsync(1).
//      advanceTimersByTimeAsync drains the microtask queue after each tick, so the
//      immediately-resolved fetch mock propagates through to setState.
//   3. Assert initial price with getByText (synchronous — no waitFor needed after act).
//   4. Advance 61_000 ms to fire the interval, flush again, assert updated price.
// ─────────────────────────────────────────────────────────────────────────────

describe('PAXG auto-refresh — interval re-fetch updates the spot price', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = ORIGINAL_FETCH;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('updates the spot-price card to the new value after 60 seconds without a page reload', async () => {
    let callCount = 0;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/axusd/oracles/nav')) {
        callCount += 1;
        const nav = callCount === 1 ? 3200 : 3500;
        const ts = callCount === 1 ? '2026-01-01T00:00:01.000Z' : '2026-01-01T00:01:01.000Z';
        return makeNavResponse(nav, ts);
      }
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;

    render(<Dashboard {...(BASE_PROPS as Parameters<typeof Dashboard>[0])} />);

    // Flush the initial useEffect (polls immediately) and drain the microtask queue
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByText(/\$3,200/)).toBeTruthy();

    // Advance past the 60-second setInterval to trigger the second poll
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000);
    });

    // Second poll fired — price should now show $3,500
    expect(screen.getByText(/\$3,500/)).toBeTruthy();
    // Old price must be gone
    expect(screen.queryByText(/\$3,200/)).toBeNull();
    // NAV endpoint must have been called at least twice
    expect(callCount).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 — poll error on second interval (fake timers + act pattern)
// ─────────────────────────────────────────────────────────────────────────────

describe('PAXG auto-refresh — error handling on subsequent polls', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = ORIGINAL_FETCH;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps the previous spot price visible and shows "Poll error" when the second poll fails', async () => {
    let callCount = 0;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/axusd/oracles/nav')) {
        callCount += 1;
        if (callCount === 1) {
          return makeNavResponse(3200, '2026-01-01T00:00:01.000Z');
        }
        throw new Error('network_timeout');
      }
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;

    render(<Dashboard {...(BASE_PROPS as Parameters<typeof Dashboard>[0])} />);

    // Initial poll succeeds → $3,200 visible
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByText(/\$3,200/)).toBeTruthy();

    // Advance past 60s → second poll throws
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000);
    });

    // Error note from the paxgPollError state branch
    expect(screen.getByText(/Poll error/i)).toBeTruthy();
    // Previous spot price must still be visible (component keeps last-good data)
    expect(screen.getByText(/\$3,200/)).toBeTruthy();
  });
});
