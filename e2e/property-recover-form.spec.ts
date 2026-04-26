/**
 * e2e/property-recover-form.spec.ts
 *
 * Task #284 — End-to-end coverage for the buyer self-service recovery form
 * shipped in task #280 at `/property/reports`.
 *
 * Task #280 ships unit-level coverage for the
 * `POST /api/property/recover-payment` endpoint
 * (`tests/property-recover-payment-endpoint.test.ts`) but no test drives a
 * real browser through the UI: the collapsed-by-default toggle, the form
 * validation messages, the success state render, and the "Open report →"
 * deep link were only verified by hand. This spec exercises the entire
 * happy path so any regression in those layers (UI state machine, fetch
 * wiring, success-state markup, link href) surfaces before production.
 *
 * What's covered:
 *   - The recovery section is collapsed by default (aria-expanded=false)
 *     and the form is not in the DOM until the toggle is clicked.
 *   - Client-side validation: missing report ID surfaces a clear error;
 *     malformed tx hash is caught before any network request fires.
 *   - Happy path: a seeded `pending` row + the deterministic seeded tx
 *     hash → POST /api/property/recover-payment → success block renders
 *     with the buyer-visible report status (`READY` after the stub
 *     generateReport override flips the row).
 *   - The "Open report →" deep link points at `/property/reports/<id>`
 *     and clicking it actually navigates there.
 *   - Headline self-rescue path: a seeded `expired` row (the case the
 *     resolver auto-expired before the buyer returned to paste the tx
 *     hash — the entire point of task #280) recovers identically.
 *
 * Why a fake verify + generate override?
 *   `resolveSingleByTxHash` → `promoteToPaid` would otherwise call
 *   `verifyOnchainPayment` (real Arbitrum RPC + real receipt) and then
 *   `generateReport` (Census / FHFA / Repliers / RentCast / Walkscore).
 *   None of those are reachable in the e2e env. The dev-only seed
 *   endpoint installs in-memory overrides for both via the
 *   `__setVerifyOnchainPaymentOverride` and `__setGenerateReportOverride`
 *   test seams so the recovery returns deterministically. Both seams
 *   are gated by `NODE_ENV !== 'production'` inside the seed endpoint.
 */

import { test, expect, type Page } from '@playwright/test';

import { BASE } from './helpers/baseURL';

interface SeedResponse {
  id: string;
  txHash: string;
  buyerWallet: string;
  buyerEmail: string;
  addressRaw: string;
  initialStatus: 'pending' | 'expired';
}

async function seedRecoverableReport(
  page: Page,
  initialStatus: 'pending' | 'expired' = 'pending',
): Promise<SeedResponse> {
  const resp = await page.request.post(
    `${BASE}/api/property/test-seed-recoverable`,
    {
      headers: { 'content-type': 'application/json' },
      data: { action: 'seed', initialStatus },
    },
  );
  if (resp.status() !== 200) {
    const body = await resp.text();
    throw new Error(
      `test-seed-recoverable (seed) must succeed; got ${resp.status()}: ${body}`,
    );
  }
  return (await resp.json()) as SeedResponse;
}

async function cleanupSeededReport(page: Page, id: string): Promise<void> {
  // Best-effort: a failed cleanup must not mask the real assertion failure.
  try {
    await page.request.post(`${BASE}/api/property/test-seed-recoverable`, {
      headers: { 'content-type': 'application/json' },
      data: { action: 'cleanup', id },
    });
  } catch {
    // ignore
  }
}

test.describe('Receipt-lookup page — buyer self-service recovery form', () => {
  let seededId: string | null = null;

  test.afterEach(async ({ page }) => {
    if (seededId) {
      await cleanupSeededReport(page, seededId);
      seededId = null;
    }
  });

  test('recovery section is collapsed by default and the form is not in the DOM', async ({
    page,
  }) => {
    await page.goto('/property/reports');

    const toggle = page.getByTestId('recover-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toContainText('Already paid? Recover your report');
    // The form itself must not be rendered until the toggle is clicked —
    // this is the collapsed-by-default contract from task #280.
    await expect(page.getByTestId('recover-form')).toHaveCount(0);
  });

  test('client-side validation rejects a missing report ID and a malformed tx hash before any network call', async ({
    page,
  }) => {
    // Track network calls so we can assert no POST escapes the client when
    // input is invalid — the validation messages exist precisely to spare
    // both buyer and rate-limiter pointless requests.
    const recoveryPosts: string[] = [];
    page.on('request', (req) => {
      if (
        req.method() === 'POST' &&
        req.url().includes('/api/property/recover-payment')
      ) {
        recoveryPosts.push(req.url());
      }
    });

    await page.goto('/property/reports');
    await page.getByTestId('recover-toggle').click();
    await expect(page.getByTestId('recover-form')).toBeVisible();

    // Empty report ID + empty tx hash → "Report ID is required."
    await page.getByTestId('recover-submit').click();
    await expect(page.getByTestId('recover-error')).toContainText(/report id/i);

    // Provide a report ID but a malformed tx hash → tx hash validation.
    await page.getByTestId('recover-report-id').fill('rep_some_test_id');
    await page.getByTestId('recover-tx-hash').fill('0xnot-a-real-hash');
    await page.getByTestId('recover-submit').click();
    await expect(page.getByTestId('recover-error')).toContainText(/66 characters/i);

    // Brief settle so any in-flight (there shouldn't be any) request is captured.
    await page.waitForTimeout(250);
    expect(
      recoveryPosts,
      'client-side validation must short-circuit before POSTing',
    ).toHaveLength(0);
  });

  test('happy path: seeded pending row → submit form → success state renders → "Open report →" link navigates to the report', async ({
    page,
  }) => {
    // 1. Seed a pending property_reports row + install in-memory verify
    //    + generate overrides so the recovery POST resolves
    //    deterministically without touching real RPC or the report
    //    pipeline.
    const seed = await seedRecoverableReport(page, 'pending');
    seededId = seed.id;

    // 2. Open the public receipt-lookup page (no auth required).
    await page.goto('/property/reports');
    await expect(
      page.getByRole('heading', { name: 'Report History' }),
    ).toBeVisible({ timeout: 10_000 });

    // 3. Expand the recovery section. Asserting on aria-expanded keeps the
    //    test honest about the actual ARIA state — not just the visible
    //    +/− glyph.
    const toggle = page.getByTestId('recover-toggle');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('recover-form')).toBeVisible();

    // 4. Fill the form with the seeded report ID + tx hash and submit.
    await page.getByTestId('recover-report-id').fill(seed.id);
    await page.getByTestId('recover-tx-hash').fill(seed.txHash);
    await page.getByTestId('recover-submit').click();

    // 5. Success block must render. The override flips status to ready,
    //    so the buyer-visible status text reads "ready". (The status
    //    span has `text-transform: uppercase` for visual rendering, but
    //    the actual text content stays lowercase, which is what
    //    Playwright's `toHaveText` compares against.)
    const success = page.getByTestId('recover-success');
    await expect(success).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('recover-success-status')).toHaveText('ready');

    // 6. Deep link must point at /property/reports/<id> and actually
    //    navigate there when clicked. This is the exact assertion the
    //    task spec calls for: "the success-state deep link is asserted
    //    to navigate to /property/reports/<id>".
    const link = page.getByTestId('recover-success-link');
    await expect(link).toHaveAttribute('href', `/property/reports/${seed.id}`);

    await link.click();
    await page.waitForURL(`**/property/reports/${seed.id}`, { timeout: 10_000 });
    expect(page.url()).toMatch(new RegExp(`/property/reports/${seed.id}$`));
  });

  test('headline self-rescue: a seeded EXPIRED row is recoverable through the form (the entire point of task #280)', async ({
    page,
  }) => {
    // The buyer returned to paste their tx hash AFTER the resolver had
    // already auto-expired the row because no transfer matched in its
    // lookback window. `resolveSingleByTxHash` accepts both 'pending'
    // and 'expired' as recoverable starting states; this assertion
    // guards that path through the UI.
    const seed = await seedRecoverableReport(page, 'expired');
    seededId = seed.id;

    await page.goto('/property/reports');
    await page.getByTestId('recover-toggle').click();
    await page.getByTestId('recover-report-id').fill(seed.id);
    await page.getByTestId('recover-tx-hash').fill(seed.txHash);
    await page.getByTestId('recover-submit').click();

    await expect(page.getByTestId('recover-success')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('recover-success-status')).toHaveText('ready');
    await expect(page.getByTestId('recover-success-link')).toHaveAttribute(
      'href',
      `/property/reports/${seed.id}`,
    );
  });
});
