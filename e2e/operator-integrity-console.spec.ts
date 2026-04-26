/**
 * e2e/operator-integrity-console.spec.ts
 *
 * Task #297 — End-to-end coverage for the operator integrity console
 * shipped in task #255 (`/operator/integrity`).
 *
 * Background:
 *   The integrity console lists recent `collateral.integrity_failed`
 *   (auto-freeze) operator-channel notifications, with a "show
 *   acknowledged" toggle (`?ack=1`) so operators can answer "what
 *   auto-froze in the last 24h, including the rows we already
 *   cleared?" The renderer and the read service
 *   (`listRecentIntegrityAlerts`) are covered by unit tests, but no
 *   real browser-driven flow exercises:
 *
 *     1. cookie auth via `requireOperatorCookie`
 *     2. the dashboard panel's "All integrity alerts →" link target
 *     3. the SSR query-string handling for `?ack=1`
 *     4. the unread vs acknowledged badge rendering for the matching
 *        toggle state
 *
 *   A regression in any of those layers would silently break the
 *   operator flow during an actual incident — exactly when it matters
 *   most.
 *
 * Setup:
 *   POST /api/capinfra/operator/auth/test-seed-integrity-alert
 *     - Inserts one operator-channel `collateral.integrity_failed`
 *       notification per call with a unique assetId/symbol.
 *     - Cleanup deletes the seeded row in afterEach so the unread
 *       queue is not leaked between runs.
 *
 *   We seed two rows: one stays unread, the other is acknowledged via
 *   the cookie-auth /api/capinfra/operator/notifications/[id]/read
 *   endpoint (which sets `readAt` on the underlying notifications row).
 *
 * Auth: dev-only POST /api/capinfra/operator/auth/test-session (same
 * pattern as the other operator-dashboard specs).
 */

import { test, expect, type Page } from '@playwright/test';

import { BASE } from './helpers/baseURL';

interface SeedResponse {
  id: string;
  assetId: string;
  symbol: string;
}

async function loginAsOperator(page: Page) {
  const resp = await page.request.post(
    `${BASE}/api/capinfra/operator/auth/test-session`,
    {
      headers: { 'content-type': 'application/json' },
      data: {},
    },
  );
  expect(
    resp.status(),
    'test-session endpoint must succeed (check NODE_ENV and ADMIN_SOLVENCY_KEY)',
  ).toBe(200);
}

async function seedIntegrityAlert(page: Page): Promise<SeedResponse> {
  const resp = await page.request.post(
    `${BASE}/api/capinfra/operator/auth/test-seed-integrity-alert`,
    {
      headers: { 'content-type': 'application/json' },
      data: { action: 'seed' },
    },
  );
  if (resp.status() !== 200) {
    const body = await resp.text();
    throw new Error(
      `test-seed-integrity-alert (seed) must succeed; got ${resp.status()}: ${body}`,
    );
  }
  return (await resp.json()) as SeedResponse;
}

async function markAlertRead(page: Page, id: string) {
  const resp = await page.request.post(
    `${BASE}/api/capinfra/operator/notifications/${encodeURIComponent(id)}/read`,
  );
  expect(
    resp.status(),
    'mark-read endpoint must accept the cookie-auth POST so the row becomes acknowledged',
  ).toBe(200);
}

async function cleanupIntegrityAlert(page: Page, id: string) {
  // Best-effort: a failed cleanup should not mask the real assertion failure.
  try {
    await page.request.post(
      `${BASE}/api/capinfra/operator/auth/test-seed-integrity-alert`,
      {
        headers: { 'content-type': 'application/json' },
        data: { action: 'cleanup', id },
      },
    );
  } catch {
    // ignore
  }
}

test.describe('Operator console — integrity alerts page', () => {
  const seededIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page);
  });

  test.afterEach(async ({ page }) => {
    while (seededIds.length > 0) {
      const id = seededIds.pop();
      if (id) await cleanupIntegrityAlert(page, id);
    }
  });

  test('dashboard link opens the integrity console; toggle reveals acknowledged rows with the right badges', async ({
    page,
  }) => {
    // 1. Seed one row that will stay unread and one that we will
    //    immediately mark read so it shows up only when the
    //    "Show acknowledged" toggle is on.
    const unreadSeed = await seedIntegrityAlert(page);
    seededIds.push(unreadSeed.id);

    const ackSeed = await seedIntegrityAlert(page);
    seededIds.push(ackSeed.id);

    // Acknowledge the second row through the same cookie-auth
    // endpoint the dashboard "Mark read" button uses, so the
    // notification row's `readAt` is set on the server.
    await markAlertRead(page, ackSeed.id);

    // 2. Land on the operator dashboard. Reaching it with a 200 also
    //    verifies the cap_operator_key cookie auth path end-to-end.
    await page.goto('/operator');

    const panel = page.getByTestId('asset-integrity-alerts-panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });

    // 3. Assert the dashboard-panel link target is /operator/integrity.
    //    A regression that points the link elsewhere would silently
    //    strand operators on the generic notifications table during
    //    an incident.
    const allLink = page.getByTestId('asset-integrity-alerts-all-link');
    await expect(allLink).toBeVisible();
    await expect(allLink).toHaveAttribute('href', '/operator/integrity');

    // 4. Click the link and confirm we land on the integrity console.
    //    We wait for navigation rather than asserting the URL alone
    //    so the test fails loudly if the click is intercepted.
    await Promise.all([
      page.waitForURL('**/operator/integrity', { timeout: 10_000 }),
      allLink.click(),
    ]);
    await expect(
      page.getByRole('heading', { name: 'Asset integrity alerts' }),
    ).toBeVisible({ timeout: 10_000 });

    // 5. Default view is unread-only. The unread row must render with
    //    its "Unread" badge; the acknowledged row must NOT appear at
    //    all (it's filtered out by the SSR `?ack` handling).
    await expect(page.getByTestId('operator-integrity-mode')).toHaveText(
      /Showing unread only/i,
    );

    const unreadRow = page.getByTestId(
      `operator-integrity-row-${unreadSeed.id}`,
    );
    await expect(
      unreadRow,
      'seeded unread integrity alert row must be visible in default view',
    ).toBeVisible();
    await expect(unreadRow).toContainText(unreadSeed.symbol);
    await expect(
      page.getByTestId(`operator-integrity-row-${unreadSeed.id}-unread`),
      'unread row must carry the "Unread" badge in the default view',
    ).toBeVisible();

    await expect(
      page.getByTestId(`operator-integrity-row-${ackSeed.id}`),
      'acknowledged row must NOT be visible in the default unread-only view',
    ).toHaveCount(0);

    // 6. Toggle "Show acknowledged". The link target carries the
    //    `?ack=1` query the SSR handler reads.
    const toggle = page.getByTestId('operator-integrity-toggle');
    await expect(toggle).toHaveText(/Show acknowledged/i);
    await expect(toggle).toHaveAttribute('href', '/operator/integrity?ack=1');

    await Promise.all([
      page.waitForURL('**/operator/integrity?ack=1', { timeout: 10_000 }),
      toggle.click(),
    ]);

    await expect(page.getByTestId('operator-integrity-mode')).toHaveText(
      /Showing unread \+ acknowledged/i,
    );

    // 7. With the toggle on, BOTH rows must render — the unread row
    //    keeps its "Unread" badge and the previously-cleared row now
    //    appears with its "Acknowledged · …" badge.
    await expect(
      page.getByTestId(`operator-integrity-row-${unreadSeed.id}`),
      'unread row must remain visible after toggling acknowledged on',
    ).toBeVisible();
    await expect(
      page.getByTestId(`operator-integrity-row-${unreadSeed.id}-unread`),
      'unread row must keep the "Unread" badge after toggling acknowledged on',
    ).toBeVisible();

    const ackRow = page.getByTestId(`operator-integrity-row-${ackSeed.id}`);
    await expect(
      ackRow,
      'previously-acknowledged row must appear when "Show acknowledged" is on',
    ).toBeVisible();
    await expect(ackRow).toContainText(ackSeed.symbol);
    await expect(
      page.getByTestId(`operator-integrity-row-${ackSeed.id}-acknowledged`),
      'acknowledged row must carry the "Acknowledged" badge under the toggle',
    ).toBeVisible();

    // 8. Toggling back must hide the acknowledged row again, proving
    //    the toggle is a true filter rather than a one-way append.
    const toggleBack = page.getByTestId('operator-integrity-toggle');
    await expect(toggleBack).toHaveText(/Hide acknowledged/i);
    await expect(toggleBack).toHaveAttribute('href', '/operator/integrity');

    await Promise.all([
      page.waitForURL((url) => url.pathname === '/operator/integrity' && url.search === '', {
        timeout: 10_000,
      }),
      toggleBack.click(),
    ]);

    await expect(page.getByTestId('operator-integrity-mode')).toHaveText(
      /Showing unread only/i,
    );
    await expect(
      page.getByTestId(`operator-integrity-row-${ackSeed.id}`),
      'acknowledged row must hide again after toggling back to unread-only',
    ).toHaveCount(0);
    await expect(
      page.getByTestId(`operator-integrity-row-${unreadSeed.id}`),
      'unread row must remain visible after toggling back to unread-only',
    ).toBeVisible();
  });
});
