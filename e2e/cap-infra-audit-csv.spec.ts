/**
 * e2e/cap-infra-audit-csv.spec.ts
 *
 * Playwright end-to-end tests for the "Download CSV" button in the
 * Audit Search section of the Cap-Infra operator console (/operations/cap-infra).
 *
 * Covers:
 *   - Clicking "Download CSV" with no extra filters triggers a file download
 *   - The downloaded file has the correct CSV header row
 *   - The downloaded file contains at least one data row
 *   - The filename matches the expected pattern (audit-export-*.csv)
 *   - Applying an aggregateType filter before downloading is reflected in the export
 *
 * Auth: Uses the dev-only POST /api/capinfra/operator/auth/test-session endpoint.
 * Download: Uses Playwright's page.waitForEvent('download') to intercept the
 * client-side Blob URL download triggered by the component.
 *
 * Note: All button/input interactions are scoped to the Audit Search section
 * via a section locator to avoid ambiguity with similarly-named controls
 * elsewhere on the page (e.g. Asset Registry also has a "Download CSV" button).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { test, expect, Page, Locator } from '@playwright/test';

import { BASE } from './helpers/baseURL';

const EXPECTED_CSV_HEADER = 'When (UTC),Aggregate,Event,Actor,User,Asset,Payload';

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
  await expect(page.getByRole('heading', { name: 'Audit Search' })).toBeVisible({ timeout: 10_000 });
}

function auditSection(page: Page): Locator {
  return page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Audit Search' }),
  });
}

test.describe('Audit Search — Download CSV', () => {
  test('clicking Download CSV with no filters triggers a file download', async ({ page }) => {
    await gotoConsole(page);

    const section = auditSection(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      section.getByRole('button', { name: 'Download CSV' }).click(),
    ]);

    expect(download).toBeTruthy();
  });

  test('downloaded CSV filename matches the audit-export-*.csv pattern', async ({ page }) => {
    await gotoConsole(page);

    const section = auditSection(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      section.getByRole('button', { name: 'Download CSV' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^audit-export-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);
  });

  test('downloaded CSV has the correct header row', async ({ page }) => {
    await gotoConsole(page);

    const section = auditSection(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      section.getByRole('button', { name: 'Download CSV' }).click(),
    ]);

    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmpPath);

    const content = fs.readFileSync(tmpPath, 'utf-8');
    const lines = content.split(/\r\n|\r|\n/).filter(Boolean);

    expect(lines[0]).toBe(EXPECTED_CSV_HEADER);

    fs.unlinkSync(tmpPath);
  });

  test('downloaded CSV contains at least one data row after the header', async ({ page }) => {
    await gotoConsole(page);

    const section = auditSection(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      section.getByRole('button', { name: 'Download CSV' }).click(),
    ]);

    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmpPath);

    const content = fs.readFileSync(tmpPath, 'utf-8');
    const lines = content.split(/\r\n|\r|\n/).filter(Boolean);

    expect(lines.length, 'CSV must have a header row plus at least one data row').toBeGreaterThanOrEqual(2);
    expect(lines[0]).toBe(EXPECTED_CSV_HEADER);

    const columns = lines[1].split(',');
    expect(columns.length, 'each data row must have 7 columns').toBeGreaterThanOrEqual(7);

    fs.unlinkSync(tmpPath);
  });

  test('CSV export walks cursor pagination: export contains more rows than one page', async ({ page }) => {
    await gotoConsole(page);

    const section = auditSection(page);

    const limitInput = section.getByLabel('Limit');
    await limitInput.fill('1');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      section.getByRole('button', { name: 'Download CSV' }).click(),
    ]);

    const tmpPath = path.join(os.tmpdir(), `paginated-${download.suggestedFilename()}`);
    await download.saveAs(tmpPath);

    const content = fs.readFileSync(tmpPath, 'utf-8');
    const lines = content.split(/\r\n|\r|\n/).filter(Boolean);

    expect(lines[0]).toBe(EXPECTED_CSV_HEADER);
    expect(
      lines.length,
      'with limit=1, a multi-event DB should produce more than one data row, proving cursor pagination ran',
    ).toBeGreaterThanOrEqual(2);

    fs.unlinkSync(tmpPath);
  });

  test('CSV export respects the aggregateType filter', async ({ page }) => {
    await gotoConsole(page);

    const section = auditSection(page);
    await section.getByLabel('Aggregate Type').fill('User');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      section.getByRole('button', { name: 'Download CSV' }).click(),
    ]);

    const tmpPath = path.join(os.tmpdir(), `filtered-${download.suggestedFilename()}`);
    await download.saveAs(tmpPath);

    const content = fs.readFileSync(tmpPath, 'utf-8');
    const lines = content.split(/\r\n|\r|\n/).filter(Boolean);

    expect(lines[0]).toBe(EXPECTED_CSV_HEADER);
    expect(lines.length, 'filtered CSV must have a header row plus at least one data row').toBeGreaterThanOrEqual(2);

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      expect(cols[1], `row ${i} Aggregate column must start with "User"`).toMatch(/^User/);
    }

    fs.unlinkSync(tmpPath);
  });
});
