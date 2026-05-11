# AXIOM PROTOCOL

## Land-First Community Ownership Platform

**Communities that control land control their future.**

Axiom Protocol is a land-first economic model that transforms how communities acquire, develop, and own real estate through SEC-compliant crowdfunding, SUSU-style pooling, and tokenized land options.

---

## Core Programs

### KeyGrow Program
The organizing principle of Axiom - a complete pipeline from land sourcing to community ownership:

1. **Property Sourcing** - Landowners submit properties or import from Zillow, Realtor, Redfin, LoopNet, LandWatch
2. **Admin Review** - Protocol admins verify property data and score leads
3. **Steward Assignment** - Local stewards conduct on-ground due diligence
4. **Steward Evaluation** - Detailed reports with site visits and risk assessments
5. **Community Vote** - Token holders vote on acquisition proposals
6. **Final Approval** - Approved properties become tokenized land options

### Three Participation Paths

| Path | Description | Min Investment |
|------|-------------|----------------|
| **Reg CF Crowdfunding** | SEC-compliant crowdfunding campaigns | $100 |
| **SUSU Pooling** | Community savings circles for land acquisition | Monthly contributions |
| **Land Option Tokens** | ERC-1155 fractional ownership tokens | Varies by property |

### Steward Corps
A distributed network of local leaders who bridge digital protocol operations with on-ground land activation:
- Due diligence and site evaluation
- Landowner relations and negotiations
- Land activation and community engagement
- Progress reporting and governance participation

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Blockchain** | Arbitrum One (Chain ID: 42161) |
| **Smart Contracts** | Solidity 0.8.20+ with OpenZeppelin |
| **Token Standards** | ERC-20 (AXM), ERC-1155 (Land Options) |
| **Stablecoin** | AXUSD (CDP + PSM hybrid design) |
| **Frontend** | Next.js 14, React, TypeScript, TailwindCSS |
| **Backend** | Node.js, Express, PostgreSQL |
| **Compliance** | SEC Reg CF, KYC verification, 6 risk disclosures |

---

## Deployed Contracts

**Network:** Arbitrum One Mainnet

| Contract | Address |
|----------|---------|
| AXM Token | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` |
| LandOptionRegistry | See [contract registry](docs/contract_registry.md) |
| AXUSD Stablecoin | See [contract registry](docs/contract_registry.md) |

Full list of 23+ verified contracts available in [docs/contract_registry.md](docs/contract_registry.md).

---

## Key Features

- **Land Acquisition System** - End-to-end property sourcing, evaluation, and tokenization
- **SEC Reg CF Compliance** - Investment limit calculator, KYC, 6 required disclosures
- **SUSU Savings Circles** - On-chain ROSCA with insurance fund protection
- **Governance** - Token-weighted voting with steward council oversight
- **Transparency Dashboard** - Real-time protocol metrics and treasury visibility
- **Social Campaigns** - Referral tracking, short links, social share tools

---

## Getting Started

### For Landowners
Submit your property for community acquisition consideration:
```
https://axiomprotocol.app/landowners/submit
```

### For Investors
Browse active crowdfunding campaigns and SUSU pools:
```
https://axiomprotocol.app/land-acquisition
```

### For Stewards
Join the Steward Corps and lead land acquisition in your region:
```
https://axiomprotocol.app/stewards/apply
```

---

## Development

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Arbitrum One RPC access

### Local Development
```bash
npm install
npm run dev
```

### Running Tests

Integration tests (including `tests/prune-oracle-fallback.test.ts`) require the database schema to be fully migrated before they can run. Always apply migrations first.

#### Environment variable setup (important for safety)

`scripts/migrate.ts` includes a guard to prevent accidental migration of production or staging databases during test runs:

| Variable | Used when | Purpose |
|---|---|---|
| `DATABASE_URL` | `NODE_ENV` is not `test` | Production / development database connection |
| `TEST_DATABASE_URL` | `NODE_ENV=test` | Dedicated test database connection |

When `NODE_ENV=test`, the migration script **requires** `TEST_DATABASE_URL` and will refuse to read `DATABASE_URL`. If `TEST_DATABASE_URL` is not set the script exits with an error rather than silently migrating the wrong database.

#### Local test runs

```bash
# Point to a dedicated local test database — never use your production DATABASE_URL here
export TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/myapp_test"
export NODE_ENV=test

# 1. Apply all pending migrations to the test database
npm run db:migrate

# 2. Run the full vitest suite
npm run test:vitest
```

Skipping the migration step will cause integration tests to fail with an explicit error listing which migrations are missing. In CI, `db:migrate` is run automatically as part of the test job before `vitest` is invoked (see `.github/workflows/main.yml`), using the `TEST_DATABASE_URL` secret stored in GitHub Actions.

#### Required GitHub Actions secrets for CI

The `predeploy-tests` job in `.github/workflows/main.yml` requires the following repository (or environment) secrets to be configured in GitHub Actions:

| Secret | Required by | Purpose |
|---|---|---|
| `TEST_DATABASE_URL` | `predeploy-tests` | Connection string for the dedicated CI test database. Used by `db:migrate`, `vitest`, and the dev server started for Playwright e2e tests. |
| `ADMIN_SOLVENCY_KEY` | `predeploy-tests` | Operator admin key used by the dev server so protected admin/test-session endpoints work during e2e tests. |

A dedicated pre-flight step (`Verify TEST_DATABASE_URL secret is configured`) runs at the start of the `predeploy-tests` job and fails fast with an actionable error message if `TEST_DATABASE_URL` is missing, so contributors are not left waiting through `npm ci` and migration steps to discover an unwired secret.

#### Avalanche Integration CI (`avalanche-integration.yml`)

The `avalanche-integration` workflow (`.github/workflows/avalanche-integration.yml`) runs on
pushes and pull requests that touch Avalanche-related files. It has two jobs:

| Job | What it does |
|---|---|
| `compile` | `npx hardhat compile --config hardhat.avalanche.ts` — verifies all Avalanche contracts compile cleanly |
| `test-fork` | `npm run test:avalanche` — runs Hardhat tests against a local fork of Avalanche C-Chain |

The following repository secrets are required for this workflow:

| Secret | Required by | Purpose |
|---|---|---|
| `AVALANCHE_RPC_URL` | `test-fork` | Avalanche C-Chain (or Fuji) RPC endpoint for fork tests. A private endpoint is strongly recommended to avoid public rate limits. |
| `SNOWTRACE_API_KEY` | post-deploy verification (optional for CI) | Routescan/Snowtrace API key for `hardhat verify` contract verification. |
| `DEPLOYER_PK` | deploy jobs only | 0x-prefixed private key for the deployer wallet (only needed when the CI deploy job is enabled). |

See `documents/chains/AXIOM_AVALANCHE_FUJI_ENV.md` for full environment variable documentation.

**Adding secrets:** Settings → Secrets and variables → Actions → New repository secret.

#### Skipping the auto-migration step

`vitest.globalSetup.ts` runs migrations automatically before the test suite when `DATABASE_URL` is set. To opt out (e.g. against a pre-migrated CI database or for fast unit-test-only runs) without unsetting `DATABASE_URL`, set:

```bash
export SKIP_MIGRATIONS=true
```

The global setup will log `[migrate] SKIP_MIGRATIONS=true — skipping auto-migration` and proceed straight to the tests.

#### Already-applied migrations are skipped automatically

You should **not** need `SKIP_MIGRATIONS=true` just to get past a migration that has already been applied. The bootstrap is designed to be safely re-runnable on any local dev database:

- Drizzle's auto-generated migrations under `migrations/` are tracked in the `drizzle.__drizzle_migrations` table; already-applied files are skipped on every subsequent run.
- Handwritten SQL migrations under `drizzle/migrations/` are tracked in the `handwritten_migrations` table (filename + checksum). Once a file has been applied successfully it is recorded there and skipped next time.
- Every handwritten migration is required to be **idempotent** — i.e. it must use `IF NOT EXISTS` / `IF EXISTS` guards (or `DO $$ ... EXCEPTION WHEN duplicate_object THEN null END $$` blocks for enums) so that it can run cleanly even on a database whose schema has already partially diverged. New handwritten migrations should follow the same pattern; if you need to drop or rename a column, guard the statement on `information_schema.columns` so the migration is still safe to re-run on a database that never had the legacy column.

This contract is enforced by two automated guards in CI (see `.github/workflows/main.yml`), both run immediately after the initial migration step:

1. **Row-count assertion on the second pass** (`npm run db:migrate:idempotency-check`, backed by `scripts/check-migrate-idempotent.ts`): records the `handwritten_migrations` row count, runs the full migration bootstrap a second time, then records the count again and exits non-zero if any rows were inserted. This catches migrations that are not correctly tracked (and would therefore re-run on every local dev bootstrap).

2. **Per-file SQL re-execution check** (`npm run test:migrate-idempotency`, backed by `tests/migrate-idempotency.test.ts`): for each `.sql` file in `drizzle/migrations/`, opens a transaction, temporarily removes the file's tracking row, re-executes the raw SQL against the fully-migrated schema, then rolls back (Postgres DDL is transactional). This catches unguarded DDL such as `ADD COLUMN` without `IF NOT EXISTS` — the column already exists in the committed schema so the statement fails — even before the tracking mechanism would have a chance to protect it.

If a re-run of `npm run test:vitest` ever fails inside `[migrate] Applying handwritten migration …`, that is a bug in the migration itself (not something to paper over with `SKIP_MIGRATIONS=true`); fix the migration to be idempotent.

### Production Build
```bash
npm run prebuild
npm start
```

### Deployment
The project uses Next.js standalone output. Run `prebuild.sh` before deploying to avoid build timeouts.

---

## Documentation

- [Whitepaper](https://axiomprotocol.app/whitepaper) - Land-first economic model
- [Contract Registry](docs/contract_registry.md) - All deployed contracts
- [API Documentation](docs/api.md) - Backend API reference
- [Steward Playbook](docs/steward-playbook.md) - Steward operations guide

---

## Security

Security vulnerabilities should be reported to: **security@axiomprotocol.app**

All smart contracts have undergone multi-AI security review. See [SECURITY.md](SECURITY.md) for details.

---

## License

**PROPRIETARY SOFTWARE - ALL RIGHTS RESERVED**

Copyright (c) 2024-2025 Axiom Protocol. Unauthorized use, copying, modification, or distribution is strictly prohibited. See [LICENSE](LICENSE) for full terms.

### Commercial Licensing
All commercial use requires a paid license. Contact: **licensing@axiomprotocol.app**

---

## Trademarks

- AXIOM™
- AXIOM PROTOCOL™
- KEYGROW™
- AXM™
- AXUSD™
- STEWARD CORPS™

---

## Contact

- **Website:** https://axiomprotocol.app
- **Licensing:** licensing@axiomprotocol.app
- **Security:** security@axiomprotocol.app
