/**
 * e2e/paxg-dashboard-auto-refresh.spec.ts
 *
 * Playwright end-to-end tests for the PAXG Reserve Contribution auto-refresh
 * behaviour on /assets/dashboard.
 *
 * Background:
 *   The PAXG Reserve Contribution section (Section 3b) polls
 *   GET /api/axusd/oracles/nav?asset=paxg-tokenized-gold-planned every 60 seconds
 *   and shows a "Last updated: HH:MM:SS · Auto-refresh 60s" timestamp.
 *   Without an automated test the polling hook could silently regress to
 *   SSR-only (e.g. if the useEffect / setInterval is accidentally removed).
 *
 * Coverage:
 *   1. The initial client-side poll fires on mount and the "Last updated:" label appears.
 *   2. The spot-price card updates to a new value after 60 seconds without a page reload
 *      (using page.clock to control the setInterval in the browser).
 *   3. A subsequent poll failure keeps the previous data visible and shows "Poll error".
 *
 * Data isolation:
 *   page.route() intercepts all calls to /api/axusd/oracles/nav so the test is
 *   fully deterministic regardless of the oracle state in the running dev server.
 *   SSR data (from getServerSideProps) reaches the oracle directly — not via HTTP —
 *   so page.route() does not affect it; partial or null SSR data is fine here because
 *   paxgNav: null is a valid starting state (the section falls back to "—" until the
 *   first client-side poll resolves).
 */

import { test, expect } from '@playwright/test';
import { BASE } from './helpers/baseURL';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNavBody(grossNavPerToken: number, fetchedAt: string): string {
  return JSON.stringify({
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
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('PAXG Reserve Contribution auto-refresh', () => {
  /**
   * Test 1: Initial poll on mount.
   *
   * The useEffect in pollPaxgNav fires immediately after mount and sets
   * paxgFetchedAt. The resulting "Last updated: HH:MM:SS · Auto-refresh 60s"
   * label is only rendered client-side — it cannot come from SSR.
   */
  test('shows "Last updated:" after the first client-side fetch completes', async ({ page }) => {
    const TS = '2026-01-01T12:00:01.000Z';

    await page.route('**/api/axusd/oracles/nav**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: makeNavBody(3200, TS),
      });
    });

    await page.goto(`${BASE}/assets/dashboard`);

    await expect(
      page.getByText('PAXG Reserve Contribution'),
    ).toBeVisible({ timeout: 15_000 });

    // The label only appears once the client-side fetch has resolved and
    // setState(new Date(json.fetchedAt)) has run.
    await expect(
      page.getByText(/Last updated:/),
    ).toBeVisible({ timeout: 10_000 });
  });

  /**
   * Test 2: Auto-refresh updates the spot price after 60 seconds.
   *
   * page.clock.install() replaces setInterval/setTimeout in the browser with
   * a fake clock that we control. After the initial poll ($3,200 is visible)
   * we advance the clock 61 seconds — this fires the setInterval callback —
   * and the component re-fetches, returning $3,500.
   */
  test('updates the spot-price card to the new value after 60 seconds without a page reload', async ({ page }) => {
    await page.clock.install();

    let callCount = 0;

    await page.route('**/api/axusd/oracles/nav**', (route) => {
      callCount += 1;
      const nav = callCount === 1 ? 3200 : 3500;
      const ts  = callCount === 1
        ? '2026-01-01T12:00:01.000Z'
        : '2026-01-01T12:01:01.000Z';
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: makeNavBody(nav, ts),
      });
    });

    await page.goto(`${BASE}/assets/dashboard`);
    await expect(
      page.getByText('PAXG Reserve Contribution'),
    ).toBeVisible({ timeout: 15_000 });

    // Wait for the initial poll to settle — $3,200 must appear first
    await expect(
      page.getByText(/Last updated:/),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText(/\$3,200/),
    ).toBeVisible({ timeout: 5_000 });

    // Advance the fake clock past the 60-second setInterval
    await page.clock.runFor(61_000);

    // The second poll fires — $3,500 must replace $3,200
    await expect(
      page.getByText(/\$3,500/),
    ).toBeVisible({ timeout: 8_000 });

    await expect(
      page.getByText(/\$3,200/),
    ).not.toBeVisible();
  });

  /**
   * Test 3: Poll error on subsequent interval.
   *
   * When the second poll fails (HTTP 500), the component surfaces a
   * "Poll error" note but keeps the previous spot price visible so the
   * allocator doesn't lose context.
   */
  test('keeps the previous spot price visible and shows "Poll error" when the second poll fails', async ({ page }) => {
    await page.clock.install();

    let callCount = 0;

    await page.route('**/api/axusd/oracles/nav**', (route) => {
      callCount += 1;
      if (callCount === 1) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: makeNavBody(3200, '2026-01-01T12:00:01.000Z'),
        });
      } else {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      }
    });

    await page.goto(`${BASE}/assets/dashboard`);
    await expect(
      page.getByText('PAXG Reserve Contribution'),
    ).toBeVisible({ timeout: 15_000 });

    // Initial poll succeeds
    await expect(page.getByText(/\$3,200/)).toBeVisible({ timeout: 10_000 });

    // Advance clock — second poll returns 500
    await page.clock.runFor(61_000);

    // Error label must appear
    await expect(page.getByText(/Poll error/i)).toBeVisible({ timeout: 8_000 });

    // Previous price must still be visible (component keeps last-good data on error)
    await expect(page.getByText(/\$3,200/)).toBeVisible();
  });
});
