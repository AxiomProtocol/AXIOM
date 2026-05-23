# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Axiom Protocol is a Next.js 14 application (Pages Router) with Hardhat smart contracts, PostgreSQL via Drizzle ORM, and many external service integrations. The root app runs on port 5000.

### Running the dev server

```bash
npm run dev
# Starts Next.js on http://0.0.0.0:5000
```

The server starts without `DATABASE_URL` set (logs a warning and skips DB setup). Pages that depend on DB queries will fail gracefully. Health endpoints (`/api/health`, `/api/healthz`) work without any external services.

### Lint

`npm run lint` currently fails due to a pre-existing dependency conflict: the `"ajv": "^8.18.0"` override in `package.json` breaks `@eslint/eslintrc` which expects ajv v6 internally. The project already sets `eslint: { ignoreDuringBuilds: true }` in `next.config.js` as a workaround. This does not affect builds.

### Tests

- **Vitest (unit/integration):** `SKIP_MIGRATIONS=true npx vitest run` — runs all unit tests without requiring a database.
- **Hardhat (contracts):** `npm run test` — runs Solidity contract tests via Hardhat.
- **Playwright (e2e):** `npm run test:e2e` — requires the dev server running and `DATABASE_URL` set.

For database-dependent tests, set `DATABASE_URL` (or `TEST_DATABASE_URL` with `NODE_ENV=test`) and run migrations first with `npm run db:migrate`. See README for details.

### Build

```bash
npm run build
# Equivalent: next build (TypeScript/ESLint errors are ignored via next.config.js)
```

The build takes ~2-3 minutes and succeeds without any external services configured.

### Key environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (optional for dev startup) |
| `SKIP_MIGRATIONS` | Set to `true` to skip auto-migration in vitest global setup |
| `AUTH0_*` | Auth0 tenant config (optional for basic page rendering) |
| `STRIPE_SECRET_KEY` | Stripe API key (optional; payment routes fail gracefully) |

### Gotchas

- The `postinstall` script runs `npm install --prefix hardhat-avalanche` for a subdirectory Hardhat project. This is expected and completes quickly on subsequent runs.
- Node.js 20+ is required. The environment ships with v22 which works fine.
- Both `package-lock.json` and `pnpm-lock.yaml` exist; use `npm ci` (matches `.cursor/environment.json`).
- The app compiles `/instrumentation` on first request and logs warnings about missing env vars. These are non-fatal.
