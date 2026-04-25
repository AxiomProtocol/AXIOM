/**
 * e2e/cap-infra-pickers.spec.ts
 *
 * Playwright end-to-end tests for the TypeAheadPicker components on the
 * Cap-Infra operator console (/operations/cap-infra).
 *
 * Covers:
 *   - Audit Search form: asset and user pickers show suggestions
 *   - Selecting a suggestion fills the field with the internal ID
 *   - Keyboard navigation (ArrowDown + Enter) selects a suggestion
 *   - Eligibility Inspector form: asset and user pickers work identically
 *   - Free-text fallback: typing an ID directly is preserved
 *
 * Auth: Uses the dev-only POST /api/capinfra/operator/auth/test-session
 * endpoint which sets the cap_operator_key cookie without requiring the
 * real ADMIN_SOLVENCY_KEY to be embedded in test code.
 */

import { test, expect, Page } from '@playwright/test';

import { BASE } from './helpers/baseURL';

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

test.describe('Audit Search — TypeAheadPicker', () => {
  test('asset picker shows dropdown suggestions when typing a symbol', async ({ page }) => {
    await gotoConsole(page);

    const assetInput = page.locator('input[placeholder="symbol or asset ID"]').first();
    await assetInput.click();
    await assetInput.type('AXAU', { delay: 50 });

    const dropdown = page.locator('ul').filter({ hasText: 'AXAU' });
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    await expect(dropdown.locator('li').first()).toContainText('AXAU');
  });

  test('selecting an asset suggestion fills the field with an internal ast_ ID', async ({ page }) => {
    await gotoConsole(page);

    const assetInput = page.locator('input[placeholder="symbol or asset ID"]').first();
    await assetInput.click();
    await assetInput.type('AXAU', { delay: 50 });

    const dropdown = page.locator('ul').filter({ hasText: 'AXAU' });
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    await dropdown.locator('li').first().click();

    await expect(assetInput).toHaveValue(/^ast_/);
    await expect(dropdown).not.toBeVisible();
  });

  test('keyboard navigation (ArrowDown + Enter) selects an asset suggestion', async ({ page }) => {
    await gotoConsole(page);

    const assetInput = page.locator('input[placeholder="symbol or asset ID"]').first();
    await assetInput.click();
    await assetInput.type('AXUSD', { delay: 50 });

    const dropdown = page.locator('ul').filter({ hasText: 'AXUSD' });
    await expect(dropdown).toBeVisible({ timeout: 3_000 });

    await assetInput.press('ArrowDown');
    await assetInput.press('Enter');

    await expect(assetInput).toHaveValue(/^ast_/);
    await expect(dropdown).not.toBeVisible();
  });

  test('user picker shows dropdown suggestions when typing an email fragment', async ({ page }) => {
    await gotoConsole(page);

    const userInput = page.locator('input[placeholder="email, wallet, or user ID"]').first();
    await userInput.click();
    await userInput.type('capinfra-smoke', { delay: 50 });

    const dropdown = page.locator('ul').filter({ hasText: 'capinfra' });
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    await expect(dropdown.locator('li').first()).toBeVisible();
  });

  test('selecting a user suggestion fills the field with an internal usr_ ID', async ({ page }) => {
    await gotoConsole(page);

    const userInput = page.locator('input[placeholder="email, wallet, or user ID"]').first();
    await userInput.click();
    await userInput.type('capinfra-smoke', { delay: 50 });

    const dropdown = page.locator('ul').filter({ hasText: 'capinfra' });
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    await dropdown.locator('li').first().click();

    await expect(userInput).toHaveValue(/^usr_/);
    await expect(dropdown).not.toBeVisible();
  });

  test('Escape key closes the dropdown without clearing the typed value', async ({ page }) => {
    await gotoConsole(page);

    const assetInput = page.locator('input[placeholder="symbol or asset ID"]').first();
    await assetInput.click();
    await assetInput.type('PAXG', { delay: 50 });

    const dropdown = page.locator('ul').filter({ hasText: 'PAXG' });
    await expect(dropdown).toBeVisible({ timeout: 3_000 });

    await assetInput.press('Escape');
    await expect(dropdown).not.toBeVisible();
    await expect(assetInput).toHaveValue('PAXG');
  });

  test('free-text fallback: typing a direct asset ID preserves the value', async ({ page }) => {
    await gotoConsole(page);

    const directId = 'ast_Li8wjk0uSWFtywcNfd48Zh';
    const assetInput = page.locator('input[placeholder="symbol or asset ID"]').first();
    await assetInput.click();
    await assetInput.fill(directId);
    await page.waitForTimeout(350);

    await assetInput.press('Escape');
    await expect(assetInput).toHaveValue(directId);
  });

  test('no dropdown appears for queries shorter than 2 characters', async ({ page }) => {
    await gotoConsole(page);

    const assetInput = page.locator('input[placeholder="symbol or asset ID"]').first();
    await assetInput.click();
    await assetInput.type('A', { delay: 50 });
    await page.waitForTimeout(350);

    await expect(page.locator('ul')).not.toBeVisible();
  });
});

test.describe('TypeAheadPicker — zero results (empty state)', () => {
  test('shows a "No results" hint when the assets API returns zero results', async ({ page }) => {
    await page.route('**/api/capinfra/assets**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      }),
    );

    await gotoConsole(page);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const assetInput = page.locator('input[placeholder="symbol or asset ID"]').first();
    const pickerContainer = assetInput.locator('..');
    await assetInput.click();
    await assetInput.type('AXAU', { delay: 50 });
    await page.waitForTimeout(400);

    await expect(pickerContainer.locator('ul')).not.toBeVisible();
    await expect(pickerContainer.getByText('No results')).toBeVisible();

    // Hint disappears when the input is cleared.
    await assetInput.fill('');
    await expect(pickerContainer.getByText('No results')).not.toBeVisible();

    expect(errors, 'No unhandled JS errors should be thrown').toHaveLength(0);
  });

  test('shows a "No results" hint when the user search API returns zero results', async ({ page }) => {
    await page.route('**/api/capinfra/operator/users/search**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      }),
    );

    await gotoConsole(page);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const userInput = page.locator('input[placeholder="email, wallet, or user ID"]').first();
    const pickerContainer = userInput.locator('..');
    await userInput.click();
    await userInput.type('capinfra-smoke', { delay: 50 });
    await page.waitForTimeout(400);

    await expect(pickerContainer.locator('ul')).not.toBeVisible();
    await expect(pickerContainer.getByText('No results')).toBeVisible();

    // Hint disappears when the input is cleared.
    await userInput.fill('');
    await expect(pickerContainer.getByText('No results')).not.toBeVisible();

    expect(errors, 'No unhandled JS errors should be thrown').toHaveLength(0);
  });
});

test.describe('TypeAheadPicker — API error state', () => {
  test('shows "Lookup unavailable" when the assets API returns a 500', async ({ page }) => {
    await page.route('**/api/capinfra/assets**', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'internal server error' }),
      }),
    );

    await gotoConsole(page);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const assetInput = page.locator('input[placeholder="symbol or asset ID"]').first();
    const pickerContainer = assetInput.locator('..');
    await assetInput.click();
    await assetInput.type('AXAU', { delay: 50 });
    await page.waitForTimeout(400);

    await expect(pickerContainer.locator('ul')).not.toBeVisible();
    await expect(pickerContainer.getByRole('alert')).toHaveText('Lookup unavailable');

    // Hint disappears when the user keeps typing.
    await assetInput.type('X', { delay: 50 });
    await expect(pickerContainer.getByRole('alert')).not.toBeVisible();

    expect(errors, 'No unhandled JS errors should be thrown').toHaveLength(0);
  });

  test('shows "Lookup unavailable" when the user search API returns a 401', async ({ page }) => {
    await page.route('**/api/capinfra/operator/users/search**', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'unauthenticated' }),
      }),
    );

    await gotoConsole(page);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const userInput = page.locator('input[placeholder="email, wallet, or user ID"]').first();
    const pickerContainer = userInput.locator('..');
    await userInput.click();
    await userInput.type('capinfra-smoke', { delay: 50 });
    await page.waitForTimeout(400);

    await expect(pickerContainer.locator('ul')).not.toBeVisible();
    await expect(pickerContainer.getByRole('alert')).toHaveText('Lookup unavailable');

    // Hint disappears when the user keeps typing.
    await userInput.type('z', { delay: 50 });
    await expect(pickerContainer.getByRole('alert')).not.toBeVisible();

    expect(errors, 'No unhandled JS errors should be thrown').toHaveLength(0);
  });
});

test.describe('Eligibility Inspector — TypeAheadPicker', () => {
  test('asset picker shows suggestions and fills with ast_ ID on selection', async ({ page }) => {
    await gotoConsole(page);

    await page.getByRole('heading', { name: 'Eligibility Inspector' }).scrollIntoViewIfNeeded();

    const assetInput = page.locator('input[placeholder="symbol or asset ID"]').nth(1);
    await assetInput.click();
    await assetInput.type('PAXG', { delay: 50 });

    const dropdown = page.locator('ul').filter({ hasText: 'PAXG' });
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    await dropdown.locator('li').first().click();

    await expect(assetInput).toHaveValue(/^ast_/);
    await expect(dropdown).not.toBeVisible();
  });

  test('user picker shows suggestions and fills with usr_ ID on selection', async ({ page }) => {
    await gotoConsole(page);

    await page.getByRole('heading', { name: 'Eligibility Inspector' }).scrollIntoViewIfNeeded();

    const userInput = page.locator('input[placeholder="email, wallet, or user ID"]').nth(1);
    await userInput.click();
    await userInput.type('capinfra', { delay: 50 });

    const dropdown = page.locator('ul').filter({ hasText: 'capinfra' });
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    await dropdown.locator('li').first().click();

    await expect(userInput).toHaveValue(/^usr_/);
    await expect(dropdown).not.toBeVisible();
  });
});
