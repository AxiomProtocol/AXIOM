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

#### Skipping the auto-migration step

`vitest.globalSetup.ts` runs migrations automatically before the test suite when `DATABASE_URL` is set. To opt out (e.g. against a pre-migrated CI database or for fast unit-test-only runs) without unsetting `DATABASE_URL`, set:

```bash
export SKIP_MIGRATIONS=true
```

The global setup will log `[migrate] SKIP_MIGRATIONS=true — skipping auto-migration` and proceed straight to the tests.

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
