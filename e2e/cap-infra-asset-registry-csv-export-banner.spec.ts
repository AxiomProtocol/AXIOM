/**
 * e2e/cap-infra-asset-registry-csv-export-banner.spec.ts
 *
 * Playwright end-to-end tests asserting that the Asset Registry section of the
 * Cap-Infra operator console (/operations/cap-infra) renders the post-export
 * confirmation banners:
 *   - A green success banner showing the row count and filename when an export
 *     produces at least one row.
 *   - An amber empty-result warning when an export with active filters matches
 *     no rows (instead of silently downloading an empty file).
 *
 * Mirrors the sibling spec for the Audit Search banners
 * (e2e/cap-infra-audit-csv-export-banner.spec.ts) and complements the existing
 * download spec in e2e/cap-infra-asset-registry-csv.spec.ts.
 */

import { test, expect, Page, Locator } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;

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

async function gotoConsole(page: Page) {
  await loginAsOperator(page);
  await page.goto('/operations/cap-infra');
  await expect(page.getByRole('heading', { name: 'Asset Registry' })).toBeVisible({
    timeout: 10_000,
  });
}

function assetRegistrySection(page: Page): Locator {
  return page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Asset Registry' }),
  });
}

test.describe('Asset Registry — Export confirmation banners', () => {
  test('successful export shows a green banner with row count and filename', async ({ page }) => {
    await gotoConsole(page);

    const section = assetRegistrySection(page);
    const downloadBtn = section.getByRole('button', { name: 'Download CSV' });
    await expect(downloadBtn).toBeVisible({ timeout: 15_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click(),
    ]);

    const filename = download.suggestedFilename();
    expect(filename).toMatch(
      /^asset-registry(-[A-Z][A-Z0-9_]*)?(-[A-Z][A-Z0-9_]*)?-\d{4}-\d{2}-\d{2}\.csv$/,
    );

    // Use an anchored regex so we don't accidentally match the empty-result
    // banner, whose copy ends with the word "exported" ("…nothing was
    // exported"). hasText with a plain string is a case-insensitive substring
    // match in Playwright.
    const banner = section
      .locator('div[role="status"]')
      .filter({ hasText: /^Exported \d/ });
    await expect(banner).toBeVisible({ timeout: 10_000 });

    const text = (await banner.innerText()).trim();
    expect(text).toMatch(/^Exported [\d,]+ assets? to asset-registry-.+\.csv\.$/);
    expect(text).toContain(filename);

    const match = text.match(/^Exported ([\d,]+) asset/);
    expect(match, 'banner must include a row count').not.toBeNull();
    const rowCount = Number(match![1].replace(/,/g, ''));
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test('export with filters that match nothing shows the amber empty-result warning', async ({
    page,
  }) => {
    await gotoConsole(page);

    const section = assetRegistrySection(page);

    // Filter for a symbol that should not exist in the asset registry. The
    // symbol filter is applied server-side, so the loaded rows will be empty
    // and the export short-circuits to the empty-result banner.
    const symbolInput = section.getByPlaceholder('Search symbol…');
    await expect(symbolInput).toBeVisible({ timeout: 15_000 });
    await symbolInput.fill('ZZZNONEXISTENTSYMBOLFOREXPORTBANNERTEST');

    const downloadBtn = section.getByRole('button', { name: 'Download CSV' });
    await expect(downloadBtn).toBeVisible({ timeout: 15_000 });

    // Wait for the table to settle on an empty state before clicking export so
    // we know the filtered fetch has completed.
    const emptyState = section.getByText('No assets match the current filters.', {
      exact: false,
    });
    await expect(emptyState).toBeVisible({ timeout: 10_000 });

    // No download event should fire — the component short-circuits on empty
    // result sets and renders the warning banner instead.
    let downloadFired = false;
    page.on('download', () => {
      downloadFired = true;
    });

    await downloadBtn.click();

    const banner = section.locator('div[role="status"]').filter({ hasText: 'No assets' });
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await expect(banner).toContainText('No assets match the current filters');
    await expect(banner).toContainText('nothing was exported');

    // Give the browser a moment to (incorrectly) start a download if the
    // empty-result short-circuit ever regresses.
    await page.waitForTimeout(500);
    expect(downloadFired, 'no file download should occur on an empty filtered export').toBe(false);

    // The success banner must NOT also be present. Use an anchored regex
    // because the empty banner copy includes the substring "exported"
    // ("…nothing was exported"), which would match a plain `hasText` filter.
    const successBanner = section
      .locator('div[role="status"]')
      .filter({ hasText: /^Exported \d/ });
    await expect(successBanner).toHaveCount(0);
  });
});
