/**
 * e2e/cap-infra-audit-legal-name.spec.ts
 *
 * Verifies that the Audit Search results table on /operations/cap-infra
 * displays the user's legal name (from cap_identity_profiles) underneath
 * the user ID, and that the legal-name line is omitted when the user has
 * no identity profile.
 *
 * Setup: A dev-only seed endpoint
 *   POST /api/capinfra/operator/auth/test-seed-audit
 * inserts two audit events tied to (a) a user with a known legal name and
 * (b) a user with no identity profile, both stamped with a unique
 * aggregateId so this test's rows can be selected without interference.
 *
 * Auth: Uses the dev-only POST /api/capinfra/operator/auth/test-session
 * endpoint (same pattern as the other cap-infra specs).
 */

import { test, expect, Page, Locator } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5000';

interface SeedResponse {
  correlationId: string;
  withName: { eventId: string; userId: string; legalName: string; aggregateId: string };
  withoutName: { eventId: string; userId: string; aggregateId: string };
}

async function loginAsOperator(page: Page) {
  const resp = await page.request.post(`${BASE}/api/capinfra/operator/auth/test-session`, {
    headers: { 'content-type': 'application/json' },
    data: {},
  });
  expect(resp.status(), 'test-session endpoint must succeed (check NODE_ENV and ADMIN_SOLVENCY_KEY)').toBe(200);
}

async function seedAuditEvents(page: Page): Promise<SeedResponse> {
  const resp = await page.request.post(`${BASE}/api/capinfra/operator/auth/test-seed-audit`, {
    headers: { 'content-type': 'application/json' },
    data: {},
  });
  expect(resp.status(), 'test-seed-audit endpoint must succeed').toBe(200);
  return (await resp.json()) as SeedResponse;
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

async function searchByAggregateId(page: Page, aggregateId: string) {
  const section = auditSection(page);
  await section.getByLabel('Aggregate ID').fill(aggregateId);
  await section.getByRole('button', { name: 'Search', exact: true }).click();
  // Wait for at least one data row to appear in the results table.
  await expect(section.locator('tbody tr').first()).toBeVisible({ timeout: 10_000 });
}

test.describe('Audit Search — legal name in results table', () => {
  test('user column shows the legal name when the user has an identity profile', async ({ page }) => {
    const seed = await seedAuditEvents(page);
    await gotoConsole(page);
    await searchByAggregateId(page, seed.withName.aggregateId);

    const section = auditSection(page);
    const dataRow = section.locator('tbody tr').first();

    await expect(dataRow).toContainText(seed.withName.userId);
    await expect(dataRow).toContainText(seed.withName.legalName);
  });

  test('user column omits the legal name when the user has no identity profile', async ({ page }) => {
    const seed = await seedAuditEvents(page);
    await gotoConsole(page);
    await searchByAggregateId(page, seed.withoutName.aggregateId);

    const section = auditSection(page);
    const dataRow = section.locator('tbody tr').first();

    await expect(dataRow).toContainText(seed.withoutName.userId);
    // The legal name from the *other* seeded user must not appear in this
    // narrowly-filtered result, since it has no identity profile of its own.
    await expect(dataRow).not.toContainText(seed.withName.legalName);
  });
});
