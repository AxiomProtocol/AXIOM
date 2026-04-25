// Single source of truth for the e2e suite's base URL. In normal runs
// playwright.config.ts publishes PLAYWRIGHT_BASE_URL before any spec
// loads; the literal below is only the last-resort fallback.
export const BASE: string =
  process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5000';
