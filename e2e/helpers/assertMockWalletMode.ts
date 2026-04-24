/**
 * e2e/helpers/assertMockWalletMode.ts
 *
 * Task #289 — guardrail that fails Playwright fast and clearly when it is
 * accidentally pointed at the real-wallet dev preview (port 5000) instead
 * of the dedicated e2e dev server (port 5001, `npm run dev:e2e`).
 *
 * Background:
 *   Task #285 split the dev preview from the e2e environment so day-to-day
 *   developers could plug their own wallet into the Replit preview pane
 *   while Playwright drove a deterministic mock wallet. Without this
 *   guardrail, a future config drift (wrong PLAYWRIGHT_BASE_URL, wrong
 *   port, lost env var) would surface as a bewildering connector picker
 *   appearing mid-test or `useAccount()` returning undefined — confusing
 *   places to debug from. This helper turns that into a one-line failure
 *   at the very start of the suite with an actionable message.
 *
 * How it works:
 *   `components/WalletConnect/ClientWalletProviders.js` sets
 *   `window.__AXIOM_E2E_WAGMI__ = true` inside the `E2EAutoConnect`
 *   component, which only mounts when `lib/web3/wagmiConfig.ts` returns
 *   `isE2EWagmi === true` (gated on `NEXT_PUBLIC_E2E_WAGMI=1` AND
 *   `NODE_ENV !== 'production'`). If we don't see that flag on the page,
 *   we are not on the e2e server and we should bail.
 *
 * Usage in a spec:
 *
 *   import { assertMockWalletModeOnce } from './helpers/assertMockWalletMode';
 *
 *   test.beforeAll(async ({ browser }) => {
 *     await assertMockWalletModeOnce(browser);
 *   });
 */

import { expect, type Browser, type Page } from '@playwright/test';

/** Stable mock buyer address baked into wagmiConfig.ts as `E2E_WAGMI_MOCK_ACCOUNT`. */
export const EXPECTED_E2E_MOCK_ADDRESS =
  '0xE2E1234567890123456789012345678901234567';

/**
 * The actionable error we want a future debugger to see. Built once so
 * the message is consistent across both helper variants.
 */
function buildFailureMessage(extra?: string): string {
  return [
    'E2E wallet mode not active — Playwright is hitting the wrong server (real wallet on port 5000?).',
    'Expected `window.__AXIOM_E2E_WAGMI__` to be true on the loaded page.',
    'That flag is set by components/WalletConnect/ClientWalletProviders.js when',
    'NEXT_PUBLIC_E2E_WAGMI=1 (see lib/web3/wagmiConfig.ts).',
    'Fix: let Playwright auto-spawn its own dev:e2e server on port 5001 (unset',
    'PLAYWRIGHT_BASE_URL), or run `npm run dev:e2e` manually and point',
    'PLAYWRIGHT_BASE_URL at it. See replit.md "Wallet Connection Architecture".',
    extra ? `Detail: ${extra}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Assert mock-wallet mode on an *already-loaded* page. Caller is responsible
 * for navigating somewhere first (any app route works — the marker is set on
 * every page because ClientWalletProviders wraps `_app.js`).
 *
 * Cost: one polled `page.evaluate()` (~5–20ms after the React tree commits).
 */
export async function assertMockWalletMode(page: Page): Promise<void> {
  if (page.url() === 'about:blank' || page.url() === '') {
    throw new Error(
      buildFailureMessage(
        'assertMockWalletMode was called before any page.goto(). Navigate to a route first, or use assertMockWalletModeOnce(browser).',
      ),
    );
  }

  // Poll briefly: ClientWalletProviders sets the marker in a useEffect, which
  // runs after React's first commit AND after wagmi's mock connector reports
  // a connected address. On a `domcontentloaded` page both are typically
  // already done, but on slow first-paint we give it a moment.
  //
  // We wrap in try/catch and rethrow with our actionable message because
  // `expect.poll` surfaces the underlying `Expected: ..., Received: ...`
  // by default — useful for the assertion library, useless for a future
  // human trying to figure out why the suite died.
  //
  // We assert BOTH the boolean flag AND the connected address. The flag
  // alone catches the wrong-port misroute; the address also catches a
  // narrower class of drift where the E2E branch ran but the mock
  // connector somehow ended up with a different account (e.g. someone
  // edits `E2E_WAGMI_MOCK_ACCOUNT` in wagmiConfig.ts without updating
  // the spec fixtures that hard-code the buyer address).
  type WindowMarker = {
    flag: boolean | null;
    address: string | null;
  };
  let observed: WindowMarker = { flag: null, address: null };
  try {
    await expect
      .poll(
        async () => {
          observed = await page.evaluate<WindowMarker>(() => {
            const w = window as unknown as {
              __AXIOM_E2E_WAGMI__?: boolean;
              __AXIOM_E2E_WAGMI_ADDRESS__?: string | null;
            };
            return {
              flag: w.__AXIOM_E2E_WAGMI__ ?? null,
              address: w.__AXIOM_E2E_WAGMI_ADDRESS__ ?? null,
            };
          });
          return (
            observed.flag === true &&
            typeof observed.address === 'string' &&
            observed.address.toLowerCase() ===
              EXPECTED_E2E_MOCK_ADDRESS.toLowerCase()
          );
        },
        { timeout: 5_000 },
      )
      .toBe(true);
  } catch {
    throw new Error(
      buildFailureMessage(
        `Loaded ${page.url()} and read window.__AXIOM_E2E_WAGMI__ = ${JSON.stringify(observed.flag)}, window.__AXIOM_E2E_WAGMI_ADDRESS__ = ${JSON.stringify(observed.address)} (expected address ${EXPECTED_E2E_MOCK_ADDRESS}).`,
      ),
    );
  }
}

/**
 * One-line `test.beforeAll` helper. Spins up its own context so it doesn't
 * pollute the test's `page` fixture, navigates to `/`, asserts the marker,
 * then tears the context down. Runs once per worker.
 *
 * Cost after server warmup: ~150ms total.
 */
export async function assertMockWalletModeOnce(browser: Browser): Promise<void> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await assertMockWalletMode(page);
  } finally {
    await context.close();
  }
}
