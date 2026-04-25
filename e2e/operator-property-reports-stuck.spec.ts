/**
 * e2e/operator-property-reports-stuck.spec.ts
 *
 * Task #276 — End-to-end coverage for the operator stuck-payments console
 * shipped in task #248 (`/operator/property-reports/stuck`).
 *
 * The shipped tests for #248 covered the resolver library
 * (`lib/property/stuckPaymentResolver.ts`) but the page + API + cookie
 * auth path was only verified by hand. This spec exercises the full
 * operator login → table render → action POST flow so regressions in
 * any of those layers surface before they reach production.
 *
 * What's covered:
 *   - Cookie auth via the dev-only POST /api/capinfra/operator/auth/test-session
 *     (sets the `cap_operator_key` cookie) — same pattern as the rest of
 *     the operator e2e suite.
 *   - A stuck pending property_reports row, seeded via the dev-only
 *     /api/operator/property-reports/test-seed-stuck endpoint, renders in
 *     the table at `/operator/property-reports/stuck`.
 *   - Clicking "Run resolver sweep" POSTs `{ mode: 'sweep' }` to
 *     /api/operator/property-reports/stuck and the page surfaces the
 *     summary message — confirming the API + UI write path.
 *   - Clicking the per-row "Expire" button POSTs `{ mode: 'expire',
 *     reportId }` and after reload the seeded row is gone (status was
 *     flipped to `expired` in the DB).
 *
 * Why a fake provider seed: the sweep call eventually hits
 * provider.getBlockNumber() / getLogs() against ARBITRUM_RPC_URL. The seed
 * endpoint installs an in-memory MinimalProvider via the existing
 * `__setStuckPaymentProvider` test seam so the sweep returns
 * deterministically without external RPC.
 */

import { test, expect, type Page } from '@playwright/test';

import { BASE } from './helpers/baseURL';

interface SeedResponse {
  id: string;
  addressRaw: string;
  buyerWallet: string;
  buyerEmail: string;
  ageMinutes: number;
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

async function seedStuckPendingReport(page: Page): Promise<SeedResponse> {
  const resp = await page.request.post(
    `${BASE}/api/operator/property-reports/test-seed-stuck`,
    {
      headers: { 'content-type': 'application/json' },
      data: { action: 'seed' },
    },
  );
  if (resp.status() !== 200) {
    const body = await resp.text();
    throw new Error(`test-seed-stuck (seed) must succeed; got ${resp.status()}: ${body}`);
  }
  return (await resp.json()) as SeedResponse;
}

async function cleanupSeededReport(page: Page, id: string) {
  // Best-effort: a failed cleanup should not mask the real assertion failure.
  try {
    await page.request.post(`${BASE}/api/operator/property-reports/test-seed-stuck`, {
      headers: { 'content-type': 'application/json' },
      data: { action: 'cleanup', id },
    });
  } catch {
    // ignore
  }
}

test.describe('Operator console — stuck property-report payments', () => {
  let seededId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page);
  });

  test.afterEach(async ({ page }) => {
    if (seededId) {
      await cleanupSeededReport(page, seededId);
      seededId = null;
    }
  });

  test('login → seeded row renders → sweep updates summary → per-row Expire clears the row', async ({
    page,
  }) => {
    // 1. Seed a pending property_reports row that is older than the
    //    resolver's MIN_PENDING_AGE (15min) but newer than its MAX
    //    (72h), and install a deterministic in-memory MinimalProvider
    //    on the resolver module so the sweep does not hit Arbitrum RPC.
    const seed = await seedStuckPendingReport(page);
    seededId = seed.id;

    // 2. Open the operator console. The page is server-rendered behind
    //    requireOperatorCookie, so getting an HTTP 200 here also
    //    verifies the cap_operator_key cookie auth path end-to-end.
    await page.goto('/operator/property-reports/stuck');
    await expect(
      page.getByRole('heading', { name: 'Stuck Property-Report Payments' }),
    ).toBeVisible({ timeout: 10_000 });

    // 3. The seeded row must render in the table. We assert on the
    //    unique addressRaw produced by the seed endpoint so the test
    //    isolates this row from any other pending rows the dev DB
    //    might already contain.
    const seededRow = page.locator('tr').filter({ hasText: seed.addressRaw });
    await expect(seededRow).toBeVisible({ timeout: 10_000 });
    await expect(seededRow).toContainText(seed.id);
    await expect(seededRow).toContainText('base');
    await expect(seededRow).toContainText('$4.99');

    // 4. Run the resolver sweep. With the fake provider returning no
    //    logs and the row only ~30min old, the resolver must scan but
    //    not resolve or expire anything — surfaced in the inline
    //    status message the page renders next to the buttons. This
    //    confirms the POST /api/operator/property-reports/stuck path
    //    + the page's response handling are intact.
    await page.getByRole('button', { name: 'Run resolver sweep' }).click();
    const status = page.locator('text=/Sweep complete/i');
    await expect(status).toBeVisible({ timeout: 15_000 });
    await expect(status).toContainText('resolved 0');
    await expect(status).toContainText('expired 0');

    // 5. Sweep left the row pending — it must still be in the table.
    await expect(seededRow).toBeVisible();

    // 6. Click the per-row Expire button. This POSTs
    //    { mode: 'expire', reportId: seed.id } which flips the row to
    //    status='expired' in the DB. The page surfaces a generic
    //    "Done. Reload to see latest state." confirmation.
    await seededRow.getByRole('button', { name: 'Expire' }).click();
    await expect(page.locator('text=/Reload to see latest state/i')).toBeVisible({
      timeout: 10_000,
    });

    // 7. Reload — listStuckPending only returns rows with status=pending,
    //    so the now-expired row must be gone from the table. We assert on
    //    the addressRaw rather than the whole table (other devs may have
    //    unrelated stuck rows in their dev DB) so this stays isolated.
    await page.goto('/operator/property-reports/stuck');
    await expect(
      page.getByRole('heading', { name: 'Stuck Property-Report Payments' }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('tr').filter({ hasText: seed.addressRaw })).toHaveCount(0);
  });
});
