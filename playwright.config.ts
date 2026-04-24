import { defineConfig, devices } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;

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
});
