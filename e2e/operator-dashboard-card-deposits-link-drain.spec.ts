/**
 * e2e/operator-dashboard-card-deposits-link-drain.spec.ts
 *
 * Task #251 — UI guard that the deprecated card-deposits link disappears
 * from the operator dashboard once the drain has completed.
 *
 * Background:
 *   Task #231 made /operator surface the "Treasury — drain in progress"
 *   section + link to /operator/treasury/card-deposits ONLY while
 *   cap_card_deposits has rows in PENDING or PAYOUT_INITIATED. If a
 *   future change to that dashboard query silently re-exposes the link
 *   to operators after the drain has completed, this spec fails so the
 *   regression is caught before it ships.
 *
 * Setup:
 *   POST /api/capinfra/operator/auth/test-seed-card-deposit (dev-only)
 *   - { action: 'seed' } archives any pre-existing in-flight rows and
 *     inserts ONE PENDING row, returning its id.
 *   - { action: 'set-status', id, status: 'SETTLED' } drains it.
 *   - { action: 'cleanup', id } removes the row in afterEach.
 *
 * Auth: dev-only POST /api/capinfra/operator/auth/test-session (same
 * pattern as the other cap-infra specs).
 */

import { test, expect, type Page } from '@playwright/test';

import { BASE } from './helpers/baseURL';

interface SeedResponse {
  id: string;
  idempotencyKey: string;
  archivedExisting: number;
}

async function loginAsOperator(page: Page) {
  const resp = await page.request.post(`${BASE}/api/capinfra/operator/auth/test-session`, {
    headers: { 'content-type': 'application/json' },
    data: {},
  });
  expect(
    resp.status(),
    'test-session endpoint must succeed (check NODE_ENV and ADMIN_SOLVENCY_KEY)',
  ).toBe(200);
}

async function seedPendingCardDeposit(page: Page): Promise<SeedResponse> {
  const resp = await page.request.post(
    `${BASE}/api/capinfra/operator/auth/test-seed-card-deposit`,
    {
      headers: { 'content-type': 'application/json' },
      data: { action: 'seed' },
    },
  );
  expect(resp.status(), 'test-seed-card-deposit (seed) must succeed').toBe(200);
  return (await resp.json()) as SeedResponse;
}

async function setCardDepositStatus(page: Page, id: string, status: string) {
  const resp = await page.request.post(
    `${BASE}/api/capinfra/operator/auth/test-seed-card-deposit`,
    {
      headers: { 'content-type': 'application/json' },
      data: { action: 'set-status', id, status },
    },
  );
  expect(
    resp.status(),
    `test-seed-card-deposit (set-status -> ${status}) must succeed`,
  ).toBe(200);
}

async function cleanupCardDeposit(page: Page, id: string) {
  // Best-effort: a failed cleanup should not mask the real assertion failure.
  try {
    await page.request.post(`${BASE}/api/capinfra/operator/auth/test-seed-card-deposit`, {
      headers: { 'content-type': 'application/json' },
      data: { action: 'cleanup', id },
    });
  } catch {
    // ignore
  }
}

test.describe('Operator dashboard — card-deposits drain link visibility', () => {
  let seededId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page);
  });

  test.afterEach(async ({ page }) => {
    if (seededId) {
      await cleanupCardDeposit(page, seededId);
      seededId = null;
    }
  });

  test('section + link appear while a row is PENDING and disappear once it reaches a terminal status; archive page itself stays reachable', async ({
    page,
  }) => {
    // 1. Seed one PENDING row and assert the dashboard shows the section
    //    + the link to the card-deposits archive console.
    const seed = await seedPendingCardDeposit(page);
    seededId = seed.id;

    await page.goto('/operator');

    const drainSection = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Treasury — drain in progress' }) });
    await expect(drainSection).toBeVisible({ timeout: 10_000 });

    const drainLink = drainSection.getByRole('link', {
      name: 'Open card deposits drain console →',
    });
    await expect(drainLink).toBeVisible();
    await expect(drainLink).toHaveAttribute('href', '/operator/treasury/card-deposits');

    // 2. Drain the row to a terminal status and reload the dashboard.
    //    The section (and therefore the link) must be gone, since the
    //    server-side count of PENDING + PAYOUT_INITIATED rows is now 0.
    await setCardDepositStatus(page, seed.id, 'SETTLED');

    await page.goto('/operator');

    await expect(
      page.getByRole('heading', { name: 'Treasury — drain in progress' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'Open card deposits drain console →' }),
    ).toHaveCount(0);

    // 3. Direct navigation to /operator/treasury/card-deposits must still
    //    work — the page is hidden from console nav once drained, but the
    //    archive (and its CSV download button) remain available for
    //    forensic lookup.
    await page.goto('/operator/treasury/card-deposits');
    await expect(
      page.getByRole('heading', { name: 'Card Deposits (Deprecated)' }),
    ).toBeVisible({ timeout: 10_000 });

    const csvButton = page.getByRole('link', { name: 'Download CSV (archive)' });
    await expect(csvButton).toBeVisible();
    await expect(csvButton).toHaveAttribute(
      'href',
      /\/api\/capinfra\/operator\/treasury\/card-deposits\/export\.csv/,
    );
  });
});
