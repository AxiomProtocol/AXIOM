/**
 * e2e/cap-infra-asset-registry-csv.spec.ts
 *
 * Playwright end-to-end tests for the "Download CSV" button in the
 * Asset Registry section of the Cap-Infra operator console (/operations/cap-infra).
 *
 * Covers:
 *   - Clicking "Download CSV" triggers a file download
 *   - The downloaded file has the correct CSV header row
 *   - The downloaded file contains at least one data row with 11 columns
 *   - The filename matches the expected pattern (asset-registry-*.csv)
 *
 * Auth: Uses the dev-only POST /api/capinfra/operator/auth/test-session endpoint.
 * Download: Uses Playwright's page.waitForEvent('download') to intercept the
 * client-side Blob URL download triggered by the component.
 *
 * Note: All button interactions are scoped to the Asset Registry section via a
 * section locator to avoid ambiguity with the "Download CSV" button in the
 * Audit Search section.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { test, expect, Page, Locator } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5000';

const EXPECTED_COLUMNS = [
  'Symbol',
  'Name',
  'Type',
  'Custody',
  'Settlement',
  'Status',
  'Spot Price',
  'Spot Source',
  'Spot As-Of (UTC)',
  'Last Reserve (UTC)',
  'Audit Events',
];

const EXPECTED_CSV_HEADER = EXPECTED_COLUMNS.join(',');

const EXPECTED_COLUMN_COUNT = EXPECTED_COLUMNS.length;

async function loginAsOperator(page: Page) {
  const resp = await page.request.post(`${BASE}/api/capinfra/operator/auth/test-session`, {
    headers: { 'content-type': 'application/json' },
    data: {},
  });
  expect(resp.status(), 'test-session endpoint must succeed (check NODE_ENV and ADMIN_SOLVENCY_KEY)').toBe(200);
}

async function gotoConsole(page: Page) {
  await loginAsOperator(page);
  await page.goto('/operations/cap-infra');
  await expect(page.getByRole('heading', { name: 'Asset Registry' })).toBeVisible({ timeout: 10_000 });
}

function assetRegistrySection(page: Page): Locator {
  return page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Asset Registry' }),
  });
}

test.describe('Asset Registry — Download CSV', () => {
  test('clicking Download CSV triggers a file download', async ({ page }) => {
    await gotoConsole(page);

    const section = assetRegistrySection(page);
    const downloadBtn = section.getByRole('button', { name: 'Download CSV' });
    await expect(downloadBtn).toBeVisible({ timeout: 15_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click(),
    ]);

    expect(download).toBeTruthy();
  });

  test('downloaded CSV filename matches the asset-registry-*.csv pattern', async ({ page }) => {
    await gotoConsole(page);

    const section = assetRegistrySection(page);
    const downloadBtn = section.getByRole('button', { name: 'Download CSV' });
    await expect(downloadBtn).toBeVisible({ timeout: 15_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click(),
    ]);

    expect(download.suggestedFilename()).toMatch(
      /^asset-registry(-[A-Z][A-Z0-9_]*)?(-[A-Z][A-Z0-9_]*)?-\d{4}-\d{2}-\d{2}\.csv$/,
    );
  });

  test('downloaded CSV has the correct header row', async ({ page }) => {
    await gotoConsole(page);

    const section = assetRegistrySection(page);
    const downloadBtn = section.getByRole('button', { name: 'Download CSV' });
    await expect(downloadBtn).toBeVisible({ timeout: 15_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click(),
    ]);

    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmpPath);

    const content = fs.readFileSync(tmpPath, 'utf-8');
    const lines = content.split(/\r\n|\r|\n/).filter(Boolean);

    expect(lines[0]).toBe(EXPECTED_CSV_HEADER);
    expect(lines[0].split(','), 'header must have exactly the expected ordered columns').toEqual(EXPECTED_COLUMNS);

    fs.unlinkSync(tmpPath);
  });

  test('downloaded CSV contains at least one data row after the header', async ({ page }) => {
    await gotoConsole(page);

    const section = assetRegistrySection(page);
    const downloadBtn = section.getByRole('button', { name: 'Download CSV' });
    await expect(downloadBtn).toBeVisible({ timeout: 15_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click(),
    ]);

    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmpPath);

    const content = fs.readFileSync(tmpPath, 'utf-8');
    const lines = content.split(/\r\n|\r|\n/).filter(Boolean);

    expect(lines.length, 'CSV must have a header row plus at least one data row').toBeGreaterThanOrEqual(2);
    expect(lines[0]).toBe(EXPECTED_CSV_HEADER);

    // Use split(',') on the raw line; quoted fields containing commas produce
    // more tokens than EXPECTED_COLUMN_COUNT, so >= is intentionally permissive.
    const firstDataCols = lines[1].split(',');
    expect(
      firstDataCols.length,
      `each data row must have at least ${EXPECTED_COLUMN_COUNT} tokens (more if asset fields contain commas)`,
    ).toBeGreaterThanOrEqual(EXPECTED_COLUMN_COUNT);

    fs.unlinkSync(tmpPath);
  });
});
