/**
 * e2e/nft-wallet-eligibility.spec.ts
 *
 * Task #352 — Playwright coverage for the /nft wallet eligibility section
 * added in Task #336.
 *
 * What this test covers:
 *  1. The /nft page loads and "Claim Your Badges" section is visible.
 *  2. The connected wallet address is surfaced in the eligibility section.
 *  3. The Founder Badge card is present with a status pill (any valid state).
 *  4. All six Participation badge types are rendered.
 *  5. Eligibility API failure → error banner + retry button (no tautological fallback).
 *  6. *** Core mint-path ***: mock eligibility as eligible, click "CLAIM FOUNDER BADGE",
 *     verify signMessage is triggered and the resulting POST to /api/nft/mint-badge
 *     carries the correct payload shape (walletAddress, signature, timestamp), then
 *     mock the success response and assert the UI renders the success state.
 *
 * Wallet mocking:
 *   Playwright auto-spawns `npm run dev:e2e` on port 5001, which sets
 *   NEXT_PUBLIC_E2E_WAGMI=1. The mock connector auto-connects as
 *   EXPECTED_E2E_MOCK_ADDRESS (0xE2E1234...) without user interaction.
 *   wagmi's built-in mock connector supports signMessage — it signs with
 *   the mock account's key, making the full sign→POST path exercisable.
 *   assertMockWalletModeOnce guards against accidental real-wallet server re-use.
 *
 * DB notes:
 *   Tests that do not care about eligibility state let the real DB decide.
 *   The mint-path test overrides /api/nft/eligibility via page.route() so it
 *   does not depend on the DB having a seeded record for the mock wallet.
 */

import { test, expect, type Browser, type Page } from '@playwright/test';
import {
  assertMockWalletModeOnce,
  EXPECTED_E2E_MOCK_ADDRESS,
} from './helpers/assertMockWalletMode';

const PARTICIPATION_BADGE_NAMES = [
  'Identity Registration',
  'Wealth Practice Member',
  'Governance Participant',
  'Property Deal Participant',
  'AXAU Early Adopter',
  'Founder Circle',
];

// ── Guard: verify mock wallet is active before any spec runs ─────────────────
test.beforeAll(async ({ browser }: { browser: Browser }) => {
  await assertMockWalletModeOnce(browser);
});

// ── Helper: mock eligibility as founder-eligible ──────────────────────────────
async function mockEligibleResponse(page: Page): Promise<void> {
  await page.route('**/api/nft/eligibility**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        walletAddress: EXPECTED_E2E_MOCK_ADDRESS.toLowerCase(),
        founderContract: '0x4A651D30097E2b7326A83CbB32c02913dB8b3572',
        participationContract: '0x67f8c7da647AbD50AFb1E2137553Be8c174342Ce',
        founder: { eligible: true, minted: false },
        participation: [1, 2, 3, 4, 5, 6].map(tokenId => ({
          tokenId,
          eligible: false,
          minted: false,
        })),
      }),
    })
  );
}

// ── Test 1: page renders with Claim Your Badges section ─────────────────────
test('nft page shows "Claim Your Badges" section when wallet is connected', async ({ page }) => {
  await page.goto('/nft', { waitUntil: 'domcontentloaded' });

  const heading = page.getByRole('heading', { name: /claim your badges/i });
  await expect(heading).toBeVisible({ timeout: 10_000 });
});

// ── Test 2: connected wallet address is shown ────────────────────────────────
test('nft page surfaces the connected wallet address', async ({ page }) => {
  await page.goto('/nft', { waitUntil: 'domcontentloaded' });

  const truncatedPrefix = EXPECTED_E2E_MOCK_ADDRESS.slice(0, 10).toLowerCase();
  const addressEl = page.locator(`text=/^${truncatedPrefix}/i`).first();
  await expect(addressEl).toBeVisible({ timeout: 10_000 });
});

// ── Test 3: Founder Badge card renders with a status pill ───────────────────
test('nft page renders Founder Badge card with a status pill', async ({ page }) => {
  await page.goto('/nft', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText(/axiom founder badge/i)).toBeVisible({ timeout: 10_000 });

  // Accept any of the three valid status states.
  // Eligible renders as "● ELIGIBLE" (with a bullet), so match the substring
  // rather than exact anchors so the bullet is not required in the pattern.
  const statusPill = page.locator(
    'text=/● ELIGIBLE|NOT ELIGIBLE|✓ MINTED/'
  ).first();
  await expect(statusPill).toBeVisible({ timeout: 10_000 });
});

// ── Test 4: all six Participation types rendered ─────────────────────────────
test('nft page renders all six participation badge types', async ({ page }) => {
  await page.goto('/nft', { waitUntil: 'domcontentloaded' });

  await expect(
    page.getByText(/participation badges/i).first()
  ).toBeVisible({ timeout: 10_000 });

  for (const name of PARTICIPATION_BADGE_NAMES) {
    await expect(
      page.getByText(name, { exact: false }).first()
    ).toBeVisible({ timeout: 8_000 });
  }
});

// ── Test 5: eligibility API error state shows retry banner ──────────────────
test('nft page shows error banner and retry button on eligibility API failure', async ({ page }) => {
  await page.route('**/api/nft/eligibility**', route =>
    route.fulfill({ status: 500, body: JSON.stringify({ error: 'internal error' }) })
  );

  await page.goto('/nft', { waitUntil: 'domcontentloaded' });

  // Must show the specific error banner — not just the heading
  await expect(
    page.getByText(/eligibility check failed/i).first()
  ).toBeVisible({ timeout: 10_000 });

  await expect(
    page.getByRole('button', { name: /retry/i })
  ).toBeVisible({ timeout: 5_000 });
});

// ── Test 6: CORE MINT PATH ────────────────────────────────────────────────────
// Mocks eligibility as eligible, clicks "CLAIM FOUNDER BADGE", captures the
// POST payload to verify walletAddress + timestamp + signature are sent, mocks
// the success response, and asserts the success state renders.
test('clicking Claim Founder Badge triggers sign → POST with correct payload and renders success state', async ({ page }) => {
  // 1. Make the mock wallet appear eligible for the Founder Badge
  await mockEligibleResponse(page);

  // 2. Intercept mint-badge POST — capture the request body and return success
  let capturedBody: Record<string, unknown> | null = null;
  await page.route('**/api/nft/mint-badge', async route => {
    const req = route.request();
    try {
      capturedBody = await req.postDataJSON() as Record<string, unknown>;
    } catch {
      capturedBody = {};
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        tokenId: 7,
        txHash: `0x${'aa'.repeat(32)}`,
        rarityTier: 'Rare',
        rarityByte: 200,
        metadataUri: 'ipfs://bafyfake',
      }),
    });
  });

  await page.goto('/nft', { waitUntil: 'domcontentloaded' });

  // 3. Wait for the Founder Badge section to switch to ELIGIBLE state.
  // The UI renders "● ELIGIBLE" (with a leading bullet character).
  await expect(page.getByText(/● ELIGIBLE/)).toBeVisible({ timeout: 10_000 });

  // 4. The claim button should now be visible and clickable
  const claimBtn = page.getByRole('button', { name: /claim founder badge/i });
  await expect(claimBtn).toBeVisible({ timeout: 8_000 });
  await expect(claimBtn).toBeEnabled();

  // 5. Click — this triggers signMessageAsync (mock connector auto-approves)
  //    then POSTs to /api/nft/mint-badge
  await claimBtn.click();

  // 6. Wait for the POST to have been made (capturedBody set by route handler)
  await expect
    .poll(() => capturedBody !== null, { timeout: 15_000 })
    .toBe(true);

  // 7. Verify the POST payload shape
  expect(capturedBody).not.toBeNull();
  expect(typeof capturedBody!.walletAddress).toBe('string');
  expect((capturedBody!.walletAddress as string).toLowerCase()).toBe(
    EXPECTED_E2E_MOCK_ADDRESS.toLowerCase()
  );
  expect(typeof capturedBody!.signature).toBe('string');
  expect((capturedBody!.signature as string).startsWith('0x')).toBe(true);
  expect(typeof capturedBody!.timestamp).toBe('number');
  // Timestamp must be within last 60s (covers network/test latency)
  expect(Date.now() - (capturedBody!.timestamp as number)).toBeLessThan(60_000);

  // 8. Assert the success state renders in the UI.
  // pages/nft.tsx renders: "You hold Founder Badge #{tokenId}" (line 301).
  await expect(
    page.getByText(/you hold founder badge #7/i).first()
  ).toBeVisible({ timeout: 10_000 });
});
