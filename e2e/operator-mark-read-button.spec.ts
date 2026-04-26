/**
 * e2e/operator-mark-read-button.spec.ts
 *
 * Task #296 — End-to-end coverage for the operator dashboard's
 * AssetIntegrityAlertsPanel "Mark read" button.
 *
 * Background:
 *   The panel POSTs to /api/capinfra/operator/notifications/[id]/read
 *   (cookie-auth wrapper around the notifications service) and then
 *   removes the row from the local unread list. We already have
 *   API-level tests for the endpoint and a component-level test for
 *   the panel, but no real browser-driven flow that exercises the
 *   actual click → request (with httpOnly cookie) → row-disappears
 *   sequence. A regression in the panel's request shape, cookie
 *   handling, or post-success refresh would otherwise slip through.
 *
 * Setup:
 *   POST /api/capinfra/operator/auth/test-seed-integrity-alert
 *     - { action: 'seed' } inserts one operator-channel
 *       `collateral.integrity_failed` notification with a unique
 *       assetId/symbol so the row is targetable by its
 *       data-testid (`asset-integrity-alert-${id}-mark-read`).
 *     - { action: 'cleanup', id } deletes the row in afterEach so
 *       the unread queue is not leaked between runs.
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
  expect(
    resp.status(),
    'test-seed-integrity-alert (seed) must succeed',
  ).toBe(200);
  return (await resp.json()) as SeedResponse;
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

test.describe('Operator dashboard — AssetIntegrityAlertsPanel "Mark read" button', () => {
  let seededId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page);
  });

  test.afterEach(async ({ page }) => {
    if (seededId) {
      await cleanupIntegrityAlert(page, seededId);
      seededId = null;
    }
  });

  test('clicking Mark read on a seeded unread alert hits the cookie-auth endpoint and removes the row from the panel', async ({
    page,
  }) => {
    // 1. Seed exactly one unread integrity-alert notification so the
    //    panel renders a row whose mark-read button we can click.
    const seed = await seedIntegrityAlert(page);
    seededId = seed.id;

    // 2. Load the operator dashboard. The panel's getServerSideProps
    //    pulls the most-recent unread integrity alerts, so our row
    //    will be at the top of the list (newest createdAt).
    await page.goto('/operator');

    const panel = page.getByTestId('asset-integrity-alerts-panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });

    const row = page.getByTestId(`asset-integrity-alert-${seed.id}`);
    await expect(
      row,
      'seeded integrity alert row must be visible before clicking Mark read',
    ).toBeVisible();

    // The row should display the seeded symbol so we know the panel
    // is rendering OUR seed (not a leftover row with a colliding id).
    await expect(row).toContainText(seed.symbol);

    const markReadButton = page.getByTestId(
      `asset-integrity-alert-${seed.id}-mark-read`,
    );
    await expect(markReadButton).toBeVisible();
    await expect(markReadButton).toHaveText(/Mark read/i);

    // 3. Click "Mark read" and capture the underlying POST so we can
    //    assert (a) the URL shape the panel actually sends and (b)
    //    that the cookie-auth wrapper accepted the request (200).
    const expectedUrl = `${BASE}/api/capinfra/operator/notifications/${encodeURIComponent(
      seed.id,
    )}/read`;

    const [markReadResponse] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url() === expectedUrl && resp.request().method() === 'POST',
        { timeout: 10_000 },
      ),
      markReadButton.click(),
    ]);

    expect(
      markReadResponse.status(),
      'mark-read endpoint must return 200 when the operator cookie is valid',
    ).toBe(200);

    // 4. The panel removes dismissed rows client-side via local state,
    //    so the row's <li> must disappear without needing a reload.
    await expect(
      row,
      'seeded row must disappear from the unread list after Mark read succeeds',
    ).toHaveCount(0, { timeout: 10_000 });

    // The mark-read button itself must also be gone (defensive — both
    // would be gone together if the row's <li> was unmounted, but
    // asserting both makes the failure mode obvious if a future
    // change splits them).
    await expect(
      page.getByTestId(`asset-integrity-alert-${seed.id}-mark-read`),
    ).toHaveCount(0);

    // 5. Reloading must not bring the row back, since the underlying
    //    notification row's `readAt` is now set on the server. This
    //    catches a regression where the panel only updates client
    //    state but the server write failed silently.
    await page.reload();

    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByTestId(`asset-integrity-alert-${seed.id}`),
      'row must remain dismissed after a full reload (server-side readAt is set)',
    ).toHaveCount(0);
  });
});
