# Axiom Protocol — Agent Development Guide

## Cursor Cloud specific instructions

### Overview

Axiom Protocol is a Next.js 14 (hybrid pages + app router) web application for
land-first community ownership. The root app is the in-scope product; `client/`,
`recruit-standalone/`, `universe-blockchain/`, `download/`, and `project/` are
out of scope (see `.cursor/rules/axiom.mdc`).

### Running the dev server

```bash
npm run dev          # starts on port 5000
```

The server will log a warning about missing `INTEGRITY_ALERT_EMAIL` /
`INTEGRITY_ALERT_DISCORD_WEBHOOK` and skip DB setup when `DATABASE_URL` is
unset. Both are harmless for local dev — pages that don't require a database
will render normally.

### Build validation (required before every PR)

```bash
npm ci
npm run build
```

Both commands must pass. See `.cursor/rules/axiom.mdc` for full validation
requirements.

### Lint

`npm run lint` (`next lint`) currently fails due to a pre-existing `ajv`
override conflict (`package.json` overrides ajv to `^8.x` but ESLint 8 requires
ajv 6). The project sets `eslint.ignoreDuringBuilds: true` in `next.config.js`
to work around this. Do not attempt to fix the lint tooling unless explicitly
asked.

### Tests

- **Vitest (unit/integration):** `SKIP_MIGRATIONS=true npm run test:vitest`
  runs all tests without requiring a database. Some integration tests will
  be skipped. Without `SKIP_MIGRATIONS`, a `DATABASE_URL` (or
  `TEST_DATABASE_URL` when `NODE_ENV=test`) must be set and migrations run
  first via `npm run db:migrate`.
- **Hardhat (smart contracts):** `npm test` (uses default `hardhat.config.ts`).
- **Playwright (E2E):** `npm run test:e2e` (requires a running dev server on
  port 5001 via `npm run dev:e2e`).

### Key gotchas

- The `.npmrc` sets `legacy-peer-deps=true` and `omit=optional`. Always use
  `npm install` (not `pnpm` or `yarn`) — the lockfile is `package-lock.json`.
- `postinstall` automatically runs `npm run install:avalanche` to install the
  `hardhat-avalanche/` sub-workspace.
- The `ajv` override in `package.json` breaks ESLint — this is known and
  intentional (see Lint section above).
- Health endpoints (`/api/health`, `/health`, `/_health`, `/api/healthz`) must
  remain functional. Changes to health routes, `server.js`, or `Dockerfile`
  must note Docker/Cloud Run risk.
