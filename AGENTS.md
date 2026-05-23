# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is the Axiom Protocol root Next.js application. The in-scope product is the root app only (see `.cursor/rules/axiom.mdc` for scope rules). Sub-directories like `client/`, `recruit-standalone/`, `universe-blockchain/`, `download/`, `project/` are out of scope unless explicitly requested.

### Running the dev server

```bash
npm run dev   # next dev -H 0.0.0.0 -p 5000
```

The server starts without `DATABASE_URL` — database-dependent routes will fail at runtime but the app still serves pages and static API routes (e.g. `/api/health`, `/api/healthz`).

### Build validation (required before any PR)

```bash
npm run build
```

TypeScript errors and ESLint errors are intentionally ignored during build (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true` in `next.config.js`).

### Lint

`npm run lint` currently fails due to a pre-existing conflict: the `ajv@^8.18.0` override in `package.json` is incompatible with ESLint 8's internal ajv 6 dependency. The project relies on `ignoreDuringBuilds: true` to keep builds green. Do not attempt to fix this unless explicitly asked.

### Tests

```bash
SKIP_MIGRATIONS=true npm run test:vitest   # Unit/integration tests (no DB required)
```

- `vitest.globalSetup.ts` auto-runs migrations if `DATABASE_URL` is set. Set `SKIP_MIGRATIONS=true` to skip when no DB is available.
- Tests that need a real database will be skipped or fail gracefully without `DATABASE_URL`.
- There are 4 pre-existing test failures in the repo (migration journal sync, reserve registry assertions, card deposits CSV header). These are not caused by environment setup.

### Key environment variables

| Variable | Purpose | Required for dev? |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection (Neon serverless in prod) | No (pages render without it) |
| `TEST_DATABASE_URL` | Dedicated test DB (used when `NODE_ENV=test`) | Only for DB-dependent tests |
| `SKIP_MIGRATIONS` | Set to `true` to skip auto-migration in vitest | Recommended when no DB |

### Gotchas

- The `postinstall` script runs `npm install --prefix hardhat-avalanche`. If this sub-install fails (network issues, missing optional native deps), it does not block the root app.
- `.npmrc` sets `legacy-peer-deps=true` and `omit=optional` — optional deps like `bcrypt`, `canvas`, `puppeteer` are intentionally skipped.
- The first page compilation in dev mode takes 10-15 seconds due to SWC downloading platform-specific binaries. Subsequent compilations are fast.
- Health endpoints: `/api/health` (JSON), `/api/healthz` (plain text "ok"), `/health`, `/_health` — all must remain functional per operational contract.
