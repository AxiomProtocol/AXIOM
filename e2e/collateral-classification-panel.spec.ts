/**
 * e2e/collateral-classification-panel.spec.ts
 *
 * Playwright end-to-end tests asserting that the public AXAU page, AXUSD
 * page, and /disclosure page actually mount the CollateralClassificationPanel
 * and render the live classification fetched from /api/capinfra/assets.
 *
 * The /api/capinfra/assets response is intercepted with a deterministic
 * fixture so the test does not depend on whatever classifications happen to
 * be in the dev database. The fixture covers:
 *   - AXAU (GREEN)
 *   - AXUSD-TREASURY (YELLOW with a basePolicyJson.perTransactionMax)
 *   - PAXG (RED, only relevant on the disclosure page)
 *
 * The AXUSD assertion intentionally reads perTransactionMax from the fixture
 * rather than asserting a magic number, matching the panel contract that
 * the cap is rendered from basePolicyJson.perTransactionMax (no hardcoded
 * value in the panel itself).
 */

import { test, expect, Page, Route } from '@playwright/test';

const PER_TX_MAX = 250_000;

const FIXTURE_ITEMS = [
  {
    id: 'ast_axau_fixture',
    symbol: 'AXAU',
    displayName: 'Axiom Gold',
    collateralClass: 'GREEN',
    collateralClassificationRationale:
      'Vaulted physical gold with daily attestation; admitted as GREEN collateral.',
    basePolicyJson: {},
    updatedAt: '2026-04-20T12:34:56.000Z',
  },
  {
    id: 'ast_axusd_treasury_fixture',
    symbol: 'AXUSD-TREASURY',
    displayName: 'Axiom USD — Treasury Strategy',
    collateralClass: 'YELLOW',
    collateralClassificationRationale:
      'Yield-bearing treasury wrapper; admitted with per-transaction cap.',
    basePolicyJson: { perTransactionMax: PER_TX_MAX },
    updatedAt: '2026-04-21T09:00:00.000Z',
  },
  {
    id: 'ast_paxg_fixture',
    symbol: 'PAXG',
    displayName: 'Paxos Gold',
    collateralClass: 'RED',
    collateralClassificationRationale: 'Third-party stablecoin; not admitted.',
    basePolicyJson: {},
    updatedAt: '2026-04-19T18:00:00.000Z',
  },
];

async function mockAssetRegistry(page: Page) {
  await page.route('**/api/capinfra/assets**', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: FIXTURE_ITEMS }),
    }),
  );
}

// Selector for a CollateralClassBadge instance — scoped to the badge element
// itself (uppercase / tracking-wider / font-bold / border span produced by
// components/design-law/CollateralClassBadge.tsx) so we are not matching the
// substring "GREEN"/"YELLOW"/"RED" appearing in marketing copy or disclosure
// prose elsewhere on the page.
const badgeLocator = (page: Page, klass: 'GREEN' | 'YELLOW' | 'RED') =>
  page.locator('span.uppercase.tracking-wider.font-bold.border', {
    hasText: new RegExp(`^${klass}$`),
  });

// Scope the assertion to the row of the panel that contains the given asset
// symbol so a regression that strips the badge from one row but leaves
// another intact still fails the test.
const panelRowFor = (page: Page, symbol: string) =>
  page
    .locator('div', { hasText: 'Last classification update:' })
    .filter({ has: page.getByText(symbol, { exact: true }) })
    .last();

test.describe('CollateralClassificationPanel — public surfaces', () => {
  test('AXAU page renders the GREEN classification badge and update timestamp', async ({
    page,
  }) => {
    await mockAssetRegistry(page);
    await page.goto('/axau');

    const row = panelRowFor(page, 'AXAU');
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(badgeLocator(page, 'GREEN')).toBeVisible();
    await expect(row.getByText(/Last classification update:/)).toBeVisible();
  });

  test('AXUSD page renders the YELLOW badge, update timestamp, and per-transaction cap from basePolicyJson', async ({
    page,
  }) => {
    await mockAssetRegistry(page);
    await page.goto('/axusd');

    const row = panelRowFor(page, 'AXUSD-TREASURY');
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(badgeLocator(page, 'YELLOW')).toBeVisible();
    await expect(row.getByText(/Last classification update:/)).toBeVisible();

    // The cap value must come from basePolicyJson.perTransactionMax in the
    // fixture, not from a hardcoded number inside the panel. We re-format
    // the same way the panel does (toLocaleString('en-US')) so this test
    // continues to pass if the fixture cap is changed.
    const expectedCap = PER_TX_MAX.toLocaleString('en-US');
    await expect(
      page.getByText(`Per-transaction cap: ${expectedCap} units`),
    ).toBeVisible();
  });

  test('Disclosure page renders badges and timestamps for each classified asset', async ({
    page,
  }) => {
    await mockAssetRegistry(page);
    await page.goto('/disclosure');

    // Each fixture asset's row must contain its own badge and timestamp.
    const cases: Array<['GREEN' | 'YELLOW' | 'RED', string]> = [
      ['GREEN', 'AXAU'],
      ['YELLOW', 'AXUSD-TREASURY'],
      ['RED', 'PAXG'],
    ];
    for (const [klass, symbol] of cases) {
      const row = panelRowFor(page, symbol);
      await expect(row).toBeVisible({ timeout: 10_000 });
      await expect(row.locator('span.uppercase.tracking-wider.font-bold.border', {
        hasText: new RegExp(`^${klass}$`),
      })).toBeVisible();
      await expect(row.getByText(/Last classification update:/)).toBeVisible();
    }

    // YELLOW per-transaction cap is also surfaced on the disclosure page.
    const expectedCap = PER_TX_MAX.toLocaleString('en-US');
    await expect(
      page.getByText(`Per-transaction cap: ${expectedCap} units`),
    ).toBeVisible();
  });
});
