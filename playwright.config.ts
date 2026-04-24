import { defineConfig, devices } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// The dev server port is hardcoded in `package.json` ("next dev ... -p 5000").
// Do NOT derive this from process.env.PORT — if PORT is set to something else,
// Playwright would poll the wrong URL while `npm run dev` still binds 5000,
// recreating the ERR_CONNECTION_REFUSED that task #261 fixed.
// Override only via PLAYWRIGHT_BASE_URL (used to point at remote environments).
const DEV_SERVER_PORT = 5000;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${DEV_SERVER_PORT}`;

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
   * Auto-start the Next dev server for e2e runs.
   *
   * - `command` matches the AXIOM Dev Server workflow (`next dev -H 0.0.0.0 -p 5000`).
   * - `url` is what Playwright polls until it responds 2xx/3xx/4xx; using the
   *   shared `baseURL` keeps the port aligned with the spec files.
   * - `reuseExistingServer: true` means devs who already have the dev workflow
   *   running don't get a port conflict — Playwright just connects to it.
   * - `timeout` is generous because cold Next.js dev startup (compile + DB
   *   migration check) can take 30–90s on first run.
   *
   * Skip auto-start by setting `PLAYWRIGHT_SKIP_WEBSERVER=1` (e.g. when
   * pointing PLAYWRIGHT_BASE_URL at a remote environment).
   */
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
