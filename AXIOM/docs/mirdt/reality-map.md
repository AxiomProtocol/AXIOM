# MIRDT V1 Reality Map — Ground Truth Scan

Date: 2026-02-11
Purpose: Document verified state of codebase before integrity fixes and language modernization.

## Package Manager

- **Package manager:** npm (package-lock.json present, no pnpm-lock.yaml or yarn.lock)
- **Node scripts:**
  - `dev`: `next dev -p 5000`
  - `build`: `NODE_ENV=production NODE_OPTIONS='--max-old-space-size=8192' next build` + standalone asset copy
  - `start`: `HOSTNAME=0.0.0.0 PORT=3000 node .next/standalone/server.js`
  - `test:lexicon`: `npx tsx tests/mirdt-lexicon.test.ts`
  - `db:push`: Drizzle schema push

## Routing (Pages Router)

| Route | Source File | Status |
|---|---|---|
| /mirdt | pages/mirdt/index.tsx | EXISTS |
| /mirdt/[id] | pages/mirdt/[id].tsx | EXISTS |
| /pilot | pages/pilot/index.tsx | EXISTS |
| /sentinel | pages/sentinel/index.tsx | EXISTS |
| /about-us | pages/about-us.tsx | EXISTS |
| /dex | pages/dex.tsx | EXISTS |
| /solvency | pages/solvency.tsx | MISSING |

Note: `app/` directory exists but Pages Router is the primary routing system. No migration planned.

## Data Layer

- **ORM:** Drizzle ORM
- **Schema location:** shared/schema.ts
- **Config:** drizzle.config.ts → schema: ./shared/schema.ts, out: ./migrations
- **Database:** PostgreSQL (Neon-backed on Replit, separate Neon instance on Vercel production)

### MIRDT Tables (confirmed in schema)

| Table | Purpose |
|---|---|
| mirdt_setups | Setup configurations with entry zones, invalidation prices, status |
| mirdt_paper_trades | Paper trade records for backtesting |
| mirdt_data_snapshots | OHLCV and market data snapshots |
| mirdt_lexicon_scan_logs | Lexicon compliance scan results (added P1) |

## Lexicon Guard

- **Location:** lib/designLaw/lexiconGuard.ts
- **Prohibited terms:** 37 terms covering crypto-native vocabulary
- **Approved replacements:** 22 institutional alternatives mapped
- **Test:** tests/mirdt-lexicon.test.ts with critical/advisory tier enforcement
- **Script:** `npm run test:lexicon`

## Integrity Fix Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| /api/mirdt/check-invalidations | POST | Transition ACTIVE setups to INVALIDATED |

## Deployment

- **Target:** Vercel (autoscale)
- **Build:** `next build` with standalone output
- **Production port:** 3000
- **Dev port:** 5000
- **Health checks:** /api/health, /healthz

## Key Observations

1. Pages Router is primary; app/ directory exists but is not migrated
2. solvency route does not exist (no pages/solvency.tsx)
3. Two separate databases: Replit dev (heliumdb) and Vercel production (neondb) — no automatic sync
4. Build requires NODE_OPTIONS='--max-old-space-size=8192' for memory headroom
5. All pages use DesignLawLayout wrapper with Design Law styling conventions
