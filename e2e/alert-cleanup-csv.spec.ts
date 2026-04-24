/**
 * e2e/alert-cleanup-csv.spec.ts
 *
 * Playwright end-to-end tests for the alert-log cleanup CSV export on the
 * Oracle Fallback History dashboard (/admin/oracle-fallbacks).
 *
 * Covers:
 *   - The "Download CSV" button is visible in the Alert Log Retention section
 *   - Clicking "Download CSV" triggers a file download
 *   - The downloaded file is named prune-alert-log-cleanup-history.csv
 *   - The downloaded CSV contains the four expected column headers
 *
 * Auth: The dashboard requires ?key=<ADMIN_SOLVENCY_KEY> in the URL.
 * Tests skip gracefully when ADMIN_SOLVENCY_KEY is not set in the environment.
 *
 * Data isolation: Both the /api/admin/oracle-fallbacks page-data endpoint
 * and the /api/admin/oracle-fallbacks-alert-cleanup-csv export endpoint are
 * intercepted with page.route() so tests are deterministic regardless of
 * the actual database state.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { test, expect, Page } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5000';
const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY ?? '';

const EXPECTED_CSV_HEADER = 'ran_at,deleted_count,retention_days,triggered_by';

const MOCK_CSV_BODY =
  EXPECTED_CSV_HEADER +
  '\r\n' +
  '2026-04-15T02:30:00.000Z,42,90,pg_cron\r\n' +
  '2026-04-14T02:30:00.000Z,0,90,http\r\n';

function makeMockPageData() {
  return {
    success: true,
    windowedCounts: { last1h: 0, last24h: 0, last7d: 0 },
    topCallers: [],
    events: [],
    pagination: { total: 0, limit: 50, offset: 0 },
    lastPrune: null,
    pruneHistory: [],
    alertLogStatus: {
      rowCount: 12,
      retentionDays: 90,
      lastCleanup: {
        ranAt: '2026-04-15T02:30:00.000Z',
        deletedCount: 42,
        retentionDays: 90,
        triggeredBy: 'pg_cron',
      },
      cleanupHistory: [
        {
          ranAt: '2026-04-15T02:30:00.000Z',
          deletedCount: 42,
          retentionDays: 90,
          triggeredBy: 'pg_cron',
        },
        {
          ranAt: '2026-04-14T02:30:00.000Z',
          deletedCount: 0,
          retentionDays: 90,
          triggeredBy: 'http',
        },
      ],
    },
  };
}

async function gotoWithMockedApis(page: Page) {
  await page.route('**/api/admin/oracle-fallbacks**', (route) => {
    if (route.request().url().includes('alert-cleanup-csv')) {
      route.fulfill({
        status: 200,
        contentType: 'text/csv; charset=utf-8',
        headers: {
          'content-disposition':
            'attachment; filename="prune-alert-log-cleanup-history.csv"',
          'cache-control': 'no-store, max-age=0',
          'x-row-count': '2',
        },
        body: MOCK_CSV_BODY,
      });
    } else if (route.request().url().includes('prune-csv')) {
      route.fulfill({
        status: 200,
        contentType: 'text/csv; charset=utf-8',
        body: 'pruned_at,deleted_count,retention_days,triggered_by,gap_hours,overdue\r\n',
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

function alertLogSection(page: Page) {
  return page.locator('div').filter({
    has: page.getByRole('heading', { name: 'Alert Log Retention' }),
  }).first();
}

test.describe('Alert Log Cleanup CSV export', () => {
  test.beforeEach(({ }, testInfo) => {
    if (!ADMIN_KEY) {
      testInfo.skip();
    }
  });

  test('Download CSV button is visible in the Alert Log Retention section', async ({ page }) => {
    await gotoWithMockedApis(page);

    const section = alertLogSection(page);
    await expect(section.getByRole('button', { name: 'Download CSV' })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('clicking Download CSV triggers a file download', async ({ page }) => {
    await gotoWithMockedApis(page);

    const section = alertLogSection(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      section.getByRole('button', { name: 'Download CSV' }).click(),
    ]);

    expect(download).toBeTruthy();
  });

  test('downloaded file is named prune-alert-log-cleanup-history.csv', async ({ page }) => {
    await gotoWithMockedApis(page);

    const section = alertLogSection(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      section.getByRole('button', { name: 'Download CSV' }).click(),
    ]);

    expect(download.suggestedFilename()).toBe('prune-alert-log-cleanup-history.csv');
  });

  test('downloaded CSV starts with the four expected column headers', async ({ page }) => {
    await gotoWithMockedApis(page);

    const section = alertLogSection(page);
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

    const section = alertLogSection(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      section.getByRole('button', { name: 'Download CSV' }).click(),
    ]);

    const tmpPath = path.join(os.tmpdir(), `rows-${download.suggestedFilename()}`);
    await download.saveAs(tmpPath);

    const content = fs.readFileSync(tmpPath, 'utf-8');
    const lines = content.split(/\r\n|\r|\n/).filter(Boolean);

    expect(lines.length, 'CSV must have a header plus at least one data row').toBeGreaterThanOrEqual(2);
    expect(lines[1].split(','), 'each data row must have 4 columns').toHaveLength(4);

    fs.unlinkSync(tmpPath);
  });

  test('shows the success toast after a download with rows', async ({ page }) => {
    await gotoWithMockedApis(page);

    const section = alertLogSection(page);
    const [, ] = await Promise.all([
      page.waitForEvent('download'),
      section.getByRole('button', { name: 'Download CSV' }).click(),
    ]);

    await expect(
      page.getByText(/Exported .* runs to prune-alert-log-cleanup-history\.csv/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('shows the empty toast when the export returns zero rows', async ({ page }) => {
    await page.route('**/api/admin/oracle-fallbacks**', (route) => {
      if (route.request().url().includes('alert-cleanup-csv')) {
        route.fulfill({
          status: 200,
          contentType: 'text/csv; charset=utf-8',
          headers: {
            'content-disposition':
              'attachment; filename="prune-alert-log-cleanup-history.csv"',
            'x-row-count': '0',
          },
          body: EXPECTED_CSV_HEADER + '\r\n',
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

    const section = alertLogSection(page);
    await section.getByRole('button', { name: 'Download CSV' }).click();

    await expect(
      page.getByText(/No alert-log cleanup runs to export/i),
    ).toBeVisible({ timeout: 5_000 });
  });
});
