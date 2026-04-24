/**
 * e2e/prune-staleness-warning.spec.ts
 *
 * Playwright end-to-end tests for the "Pruning Overdue" staleness banner
 * on the Oracle Fallback History dashboard (/admin/oracle-fallbacks).
 *
 * Covers:
 *   - The "Pruning Overdue" banner appears when the API reports no prune history
 *     (lastPrune=null, equivalent to a never_run scenario)
 *   - The "Pruning Overdue" banner appears when the last prune was stale
 *     (lastPrune.pruned_at is more than PRUNE_STALE_HOURS ago)
 *   - The banner is NOT shown when the last prune was recent
 *
 * Auth: The dashboard requires ?key=<ADMIN_SOLVENCY_KEY> in the URL.
 * ADMIN_SOLVENCY_KEY is forwarded to the dev server in CI so these tests
 * always have an authenticated session available.
 *
 * Data isolation: The /api/admin/oracle-fallbacks client-side fetch is
 * intercepted by Playwright's page.route() so tests are deterministic
 * regardless of the actual database state.
 */

import { test, expect, Page } from '@playwright/test';
import { PRUNE_STALE_HOURS } from '../lib/admin/config';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5000';
const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY ?? '';

interface MockLastPrune {
  pruned_at: string;
  deleted_count: number;
  retention_days: number;
  triggered_by: string;
}

function makeApiResponse(lastPrune: MockLastPrune | null) {
  return {
    success: true,
    windowedCounts: { last1h: 0, last24h: 0, last7d: 0 },
    topCallers: [],
    events: [],
    pagination: { total: 0, limit: 50, offset: 0 },
    lastPrune,
    pruneHistory: lastPrune ? [lastPrune] : [],
  };
}

async function gotoWithMockedApi(page: Page, lastPrune: MockLastPrune | null) {
  await page.route('**/api/admin/oracle-fallbacks**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(makeApiResponse(lastPrune)),
    });
  });

  await page.goto(`${BASE}/admin/oracle-fallbacks?key=${encodeURIComponent(ADMIN_KEY)}`);
  await expect(page.getByRole('heading', { name: 'Oracle Fallback History' })).toBeVisible({
    timeout: 10_000,
  });
}

test.describe('Pruning Overdue banner', () => {
  test('banner appears when no prune has ever run (lastPrune is null)', async ({ page }) => {
    await gotoWithMockedApi(page, null);

    await expect(page.getByText('Pruning Overdue')).toBeVisible({ timeout: 8_000 });
  });

  test('banner message says no pruning run has been recorded when lastPrune is null', async ({ page }) => {
    await gotoWithMockedApi(page, null);

    await expect(
      page.getByText('No pruning run has ever been recorded'),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('banner appears when last prune exceeded PRUNE_STALE_HOURS', async ({ page }) => {
    const staleMs = (PRUNE_STALE_HOURS + 5) * 60 * 60 * 1000;
    const stalePrunedAt = new Date(Date.now() - staleMs).toISOString();

    await gotoWithMockedApi(page, {
      pruned_at: stalePrunedAt,
      deleted_count: 0,
      retention_days: 90,
      triggered_by: 'http',
    });

    await expect(page.getByText('Pruning Overdue')).toBeVisible({ timeout: 8_000 });
  });

  test('banner shows hours-ago message for a stale (but recorded) prune', async ({ page }) => {
    const staleMs = (PRUNE_STALE_HOURS + 5) * 60 * 60 * 1000;
    const stalePrunedAt = new Date(Date.now() - staleMs).toISOString();

    await gotoWithMockedApi(page, {
      pruned_at: stalePrunedAt,
      deleted_count: 0,
      retention_days: 90,
      triggered_by: 'http',
    });

    await expect(
      page.getByText(/hours ago — exceeds the \d+-hour threshold/),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('banner is NOT shown when last prune was recent (1 hour ago)', async ({ page }) => {
    const recentPrunedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    await gotoWithMockedApi(page, {
      pruned_at: recentPrunedAt,
      deleted_count: 5,
      retention_days: 90,
      triggered_by: 'http',
    });

    await expect(page.getByText('Pruning Overdue')).not.toBeVisible({ timeout: 5_000 });
  });
});
