import { defineConfig, devices } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// Playwright runs against its OWN dev server on port 5001 (separate from the
// AXIOM Dev Server workflow on port 5000). This split exists because the e2e
// suite needs `NEXT_PUBLIC_E2E_WAGMI=1` to drive the wagmi mock-connector
// path, while day-to-day dev preview must keep using the real wagmi/Reown
// stack so devs can actually plug their own wallets in. Before this split,
// the env var was set in `webServer.env` with `reuseExistingServer: true`,
// which silently failed for any dev with the workflow already running on
// 5000 — Playwright reused the env-less server and the mock wallet never
// engaged. Two ports = two unambiguous modes.
//
// Override `PLAYWRIGHT_BASE_URL` to point at a remote environment.
const E2E_DEV_SERVER_PORT = 5001;
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${E2E_DEV_SERVER_PORT}`;

// Many specs build absolute URLs from `process.env.PLAYWRIGHT_BASE_URL`
// (with a 'http://localhost:5000' fallback). Now that Playwright's own
// dev server lives on 5001, we publish the resolved baseURL into the
// process env BEFORE any spec module is imported, so those specs hit
// the e2e server (with mock wallet) instead of accidentally reaching
// the dev workflow on 5000.
if (!process.env.PLAYWRIGHT_BASE_URL) {
  process.env.PLAYWRIGHT_BASE_URL = baseURL;
}

/**
 * Resolve a chromium binary that actually has its shared libraries on this
 * machine.
 *
 * In this Replit / Nix workspace the Playwright-bundled chrome-headless-shell
 * is missing system libraries (libglib-2.0.so.0 etc.), so the bundled binary
 * cannot launch. Instead we prefer a Nix-provided `chromium` whose runtime
 * deps come from the same Nix closure.
 *
 * Resolution order:
 *   1. Explicit `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` (CI / advanced users).
 *   2. `chromium` on PATH (Nix `pkgs.chromium`, declared in replit.nix).
 *   3. `chromium-browser` on PATH (Debian-style alias).
 *   4. Common system locations (/usr/bin/chromium, /usr/bin/google-chrome).
 *   5. Fall back to `undefined` so Playwright uses its own bundled binary.
 */
function resolveChromiumExecutable(): string | undefined {
  const explicit = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (explicit && existsSync(explicit)) {
    return explicit;
  }

  for (const candidate of ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) {
    const which = spawnSync('which', [candidate], { encoding: 'utf8' });
    const resolved = which.stdout?.trim();
    if (which.status === 0 && resolved && existsSync(resolved)) {
      return resolved;
    }
  }

  for (const candidate of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

const chromiumExecutable = resolveChromiumExecutable();

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: {
      executablePath: chromiumExecutable,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /**
   * Auto-start a dedicated Next dev server for e2e runs on port 5001.
   *
   * - `command` is `npm run dev:e2e`, which sets `NEXT_PUBLIC_E2E_WAGMI=1`
   *   inline so the wagmi mock-connector path activates (hard-gated to
   *   non-production in `lib/web3/wagmiConfig.ts`). The env var is in the
   *   script — NOT here in `webServer.env` — because that field only
   *   applies when Playwright spawns a fresh server, and we want the env
   *   guarantee to hold even if a previous Playwright run left a server
   *   on 5001 that gets reused.
   * - `url` polls baseURL (port 5001) until it responds.
   * - `reuseExistingServer: true` means a leftover Playwright server on
   *   5001 from a prior run is reused — but the AXIOM Dev Server (5000)
   *   never collides with this, so devs can keep their wallet preview
   *   running while iterating on tests.
   * - `timeout` is generous because cold Next.js dev startup (compile +
   *   DB migration check) can take 30–90s on first run.
   *
   * Skip auto-start with `PLAYWRIGHT_SKIP_WEBSERVER=1` (e.g. when
   * pointing `PLAYWRIGHT_BASE_URL` at a remote environment).
   */
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run dev:e2e',
        url: baseURL,
        // Reuse a leftover dev:e2e server only in local interactive runs.
        // In CI, always spawn a fresh server so we can never inherit a
        // stale process from a different test run with different env.
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
