/**
 * e2e/prune-history-csv.spec.ts
 *
 * Playwright end-to-end tests for the prune history CSV export on the
 * Oracle Fallback History dashboard (/admin/oracle-fallbacks).
 *
 * Covers:
 *   - The "Download CSV" button is visible in the Data Hygiene section
 *   - Clicking "Download CSV" triggers a file download
 *   - The downloaded file is named oracle-fallback-prune-history.csv
 *   - The downloaded CSV contains the correct six-column header row
 *
 * Auth: The dashboard requires ?key=<ADMIN_SOLVENCY_KEY> in the URL.
 * Tests skip gracefully when ADMIN_SOLVENCY_KEY is not set in the environment.
 *
 * Data isolation: Both the /api/admin/oracle-fallbacks page-data endpoint
 * and the /api/admin/oracle-fallbacks-prune-csv export endpoint are
 * intercepted with page.route() so tests are deterministic regardless of
 * the actual database state.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { test, expect, Page } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5000';
const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY ?? '';

const EXPECTED_CSV_HEADER =
  'pruned_at,deleted_count,retention_days,triggered_by,gap_hours,overdue';

const MOCK_CSV_BODY =
  EXPECTED_CSV_HEADER +
  '\r\n' +
  '2026-01-15T12:00:00.000Z,42,90,pg_cron,28.0,yes\r\n' +
  '2026-01-14T08:00:00.000Z,0,90,http,,\r\n';

function makeMockPageData() {
  return {
    success: true,
    windowedCounts: { last1h: 0, last24h: 0, last7d: 0 },
    topCallers: [],
    events: [],
    pagination: { total: 0, limit: 50, offset: 0 },
    lastPrune: {
      pruned_at: '2026-01-15T12:00:00.000Z',
      deleted_count: 42,
      retention_days: 90,
      triggered_by: 'pg_cron',
    },
    pruneHistory: [
      {
        pruned_at: '2026-01-15T12:00:00.000Z',
        deleted_count: 42,
        retention_days: 90,
        triggered_by: 'pg_cron',
      },
    ],
  };
}

async function gotoWithMockedApis(page: Page) {
  await page.route('**/api/admin/oracle-fallbacks**', (route) => {
    if (route.request().url().includes('prune-csv')) {
      route.fulfill({
        status: 200,
        contentType: 'text/csv; charset=utf-8',
        headers: {
          'content-disposition': 'attachment; filename="oracle-fallback-prune-history.csv"',
          'cache-control': 'no-store, max-age=0',
        },
        body: MOCK_CSV_BODY,
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeMockPageData()),
      });
    }
  });

  await page.goto(`${BASE}/admin/oracle-fallbacks?key=${encodeURIComponent(ADMIN_KEY)}`);
  await expect(page.getByRole('heading', { name: 'Oracle Fallback History' })).toBeVisible({
    timeout: 10_000,
  });
}

function dataHygieneSection(page: Page) {
  return page.locator('div').filter({
    has: page.getByRole('heading', { name: 'Data Hygiene' }),
  }).first();
}

test.describe('Prune History CSV export', () => {
  test.beforeEach(({ }, testInfo) => {
    if (!ADMIN_KEY) {
      testInfo.skip();
    }
  });

  test('Download CSV button is visible in the Data Hygiene section', async ({ page }) => {
    await gotoWithMockedApis(page);

    const section = dataHygieneSection(page);
    await expect(section.getByRole('button', { name: 'Download CSV' })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('clicking Download CSV triggers a file download', async ({ page }) => {
    await gotoWithMockedApis(page);

    const section = dataHygieneSection(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      section.getByRole('button', { name: 'Download CSV' }).click(),
    ]);

    expect(download).toBeTruthy();
  });

  test('downloaded file is named oracle-fallback-prune-history.csv', async ({ page }) => {
    await gotoWithMockedApis(page);

    const section = dataHygieneSection(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      section.getByRole('button', { name: 'Download CSV' }).click(),
    ]);

    expect(download.suggestedFilename()).toBe('oracle-fallback-prune-history.csv');
  });

  test('downloaded CSV starts with the six expected column headers', async ({ page }) => {
    await gotoWithMockedApis(page);

    const section = dataHygieneSection(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      section.getByRole('button', { name: 'Download CSV' }).click(),
    ]);

    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmpPath);

    const content = fs.readFileSync(tmpPath, 'utf-8');
    const firstLine = content.split(/\r\n|\r|\n/)[0];

    expect(firstLine).toBe(EXPECTED_CSV_HEADER);

    fs.unlinkSync(tmpPath);
  });

  test('downloaded CSV contains data rows after the header', async ({ page }) => {
    await gotoWithMockedApis(page);

    const section = dataHygieneSection(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      section.getByRole('button', { name: 'Download CSV' }).click(),
    ]);

    const tmpPath = path.join(os.tmpdir(), `rows-${download.suggestedFilename()}`);
    await download.saveAs(tmpPath);

    const content = fs.readFileSync(tmpPath, 'utf-8');
    const lines = content.split(/\r\n|\r|\n/).filter(Boolean);

    expect(lines.length, 'CSV must have a header plus at least one data row').toBeGreaterThanOrEqual(2);
    expect(lines[1].split(','), 'each data row must have 6 columns').toHaveLength(6);

    fs.unlinkSync(tmpPath);
  });
});
