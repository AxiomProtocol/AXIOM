// Single source of truth for the e2e suite's base URL. In normal runs
// playwright.config.ts publishes PLAYWRIGHT_BASE_URL before any spec
// loads; the literal below is only the last-resort fallback and is
// intentionally set to the canonical e2e dev server port (5001, `npm run
// dev:e2e`) — not the day-to-day AXIOM Dev Server on port 5000 which
// runs the real wallet stack and would fail assertMockWalletModeOnce.
export const BASE: string =
  process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5001';
