/**
 * e2e/cap-infra-audit-csv-export-banner.spec.ts
 *
 * Playwright end-to-end tests asserting that the Audit Search section of the
 * Cap-Infra operator console (/operations/cap-infra) renders the post-export
 * confirmation banners:
 *   - A green success banner showing the row count and filename when an export
 *     produces at least one row.
 *   - An amber empty-result warning when an export with active filters matches
 *     no rows (instead of silently downloading an empty file).
 */

import { test, expect, Page, Locator } from '@playwright/test';

import { BASE } from './helpers/baseURL';

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
  await expect(page.getByRole('heading', { name: 'Audit Search' })).toBeVisible({ timeout: 10_000 });
}

function auditSection(page: Page): Locator {
  return page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Audit Search' }),
  });
}

test.describe('Audit Search — Export confirmation banners', () => {
  test('successful export shows a green banner with row count and filename', async ({ page }) => {
    await gotoConsole(page);

    const section = auditSection(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      section.getByRole('button', { name: 'Download CSV' }).click(),
    ]);

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^audit-export-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);

    const banner = section.locator('div[role="status"]').filter({ hasText: 'Exported' });
    await expect(banner).toBeVisible({ timeout: 10_000 });

    const text = (await banner.innerText()).trim();
    expect(text).toMatch(/^Exported [\d,]+ audit events? to audit-export-.+\.csv\.$/);
    expect(text).toContain(filename);

    const match = text.match(/Exported ([\d,]+) audit event/);
    expect(match, 'banner must include a row count').not.toBeNull();
    const rowCount = Number(match![1].replace(/,/g, ''));
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test('export with filters that match nothing shows the amber empty-result warning', async ({
    page,
  }) => {
    await gotoConsole(page);

    const section = auditSection(page);

    // Filter for an aggregate type that should not exist in the audit log.
    await section
      .getByLabel('Aggregate Type')
      .fill('ZzzNonexistentAggregateForExportBannerTest');

    // No download event should fire — the component short-circuits on empty
    // result sets and renders the warning banner instead.
    let downloadFired = false;
    page.on('download', () => {
      downloadFired = true;
    });

    await section.getByRole('button', { name: 'Download CSV' }).click();

    const banner = section.locator('div[role="status"]').filter({ hasText: 'No audit events' });
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await expect(banner).toContainText('No audit events match the current filters');
    await expect(banner).toContainText('nothing was exported');

    // Give the browser a moment to (incorrectly) start a download if the
    // empty-result short-circuit ever regresses.
    await page.waitForTimeout(500);
    expect(downloadFired, 'no file download should occur on an empty filtered export').toBe(false);

    // The success banner must NOT also be present.
    const successBanner = section.locator('div[role="status"]').filter({ hasText: 'Exported' });
    await expect(successBanner).toHaveCount(0);
  });
});
