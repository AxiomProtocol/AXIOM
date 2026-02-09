# Axiom Smart City - Sovereign Digital-Physical Economy

## Overview
The Axiom Smart City project aims to establish America's first 1,000-acre on-chain sovereign smart city economy. It functions as a community-governed DeFi protocol with a robust treasury system and economic engine. Its core purpose is to create a model for future sovereign digital-physical economies, emphasizing self-custody and a non-custodial DeFi approach. Key capabilities include a governance token (AXM), DeFi treasury tools, real estate tokenization, DePIN infrastructure, smart city services, cross-chain interoperability, and sustainability initiatives within a decentralized, community-governed framework.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.
- **Navigation system**: When adding new pages, add them to ALL THREE navigation files:
  1. `components/axiomRebuild/navConfig.ts` - RebuildNav system (mobile menu)
  2. `components/navigation/SiteNavModel.ts` - Site navigation model
  3. `lib/navigation.js` - Desktop dropdown (ADVANCED_DROPDOWN)
  4. Also add to `REBUILD_NAV_PAGES` in `pages/_app.js` for route matching
- **Page structure**: New pages should match the DEX page structure - white background, no Layout wrapper, teal accent colors, fragment wrapper (`<>`), consistent container styling (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`).
- **DEPRECATED - Old page structure**: Do NOT use the old dark-themed structure with `<Layout>` wrapper, `bg-black`/`bg-gray-900` backgrounds, or yellow accent colors. This pattern is deprecated. All new pages must follow the DEX page pattern described above.
- **Data sources**: NEVER use hardcoded placeholder data in any new pages. Always fetch real data from blockchain (via services like `CamelotPoolService`), database (PostgreSQL/Drizzle), or external APIs. Use async data fetching patterns with proper loading states and error handling.

## Active Pages (35 Core Pages)
The project has been streamlined to 40 active pages (35 core + 5 observer subpages) to improve build/deploy speed. All other pages are archived in `_archive/` organized by roadmap phase.

### Core Platform
- `/` - Homepage
- `/about-us` - About Us
- `/how-it-works` - How It Works
- `/team` - Team
- `/404` - Error page
- `/faq` - FAQ
- `/terms-and-conditions` - Terms

### Axiom Capital Program (8 pages)
- `/pilot` - Dashboard
- `/pilot/investors` - Investor Portal
- `/pilot/distributions` - Distribution Engine
- `/pilot/reports` - Reporting Suite
- `/pilot/documents` - Investor Data Room
- `/pilot/projections` - Return Projections
- `/pilot/performance` - Performance & Phase 2 Gate
- `/pilot/audit` - Compliance Audit Trail

### Institutional / Observer (4 + subpages)
- `/observer` - Observer Dashboard (+ capital-bridge, node-economy, treasury, risk, governance, assets, reports subpages)
- `/institutional` - Institutional Overview

### Lending Fund (3 pages)
- `/lending-fund` - Fund Overview
- `/lending-fund/invest` - Invest in Fund
- `/lending-fund/apply` - Apply for Loan

### DeFi Core (5 pages)
- `/dex` - DEX Exchange
- `/earn` - Earn Yield
- `/borrow` - Borrow AXUSD
- `/axusd` - AXUSD Stablecoin
- `/buy-axm` - Buy AXM

### Products & Dashboard (3 pages)
- `/products` - Product Catalog
- `/roadmap` - Product Roadmap
- `/dashboard` - User Dashboard

### Intelligence Terminal (2 pages)
- `/mirdt` - Market Intelligence & Risk Disclosure Terminal (probabilistic trend-following analysis, data-grid table, pagination, audit trail)
- `/mirdt/[id]` - Setup Detail (audit fields, rationale trace, paper-trade ledger)

### Community & Trust (4 pages)
- `/community` - Community
- `/transparency` - Transparency
- `/impact` - Community Impact
- `/join` - Join / Onboarding

## Archive Structure (Roadmap Phases)
Archived pages are in `_archive/` organized by future release phase. Archived API routes are in `_archive/api/` (moved out of `pages/api/` to reduce build compilation from 460+ routes to ~144).

- **`_archive/phase2-defi-advanced/`** - DeFi advanced features: bank, tokenomics, staking, axiom-nodes, launchpad, analytics, yield-vault, DSCR loans, note pipeline, mortgage notes, savings, rent streams, credit lines, insurance pools, treasury notes, treasury ops, intelligence, DePIN, compliance
- **`_archive/phase3-land-stewards/`** - Land & Stewards: KeyGrow, land marketplace, land acquisition, land funds, landowners, stewards system, builder credit, land lifecycle, reclaim
- **`_archive/phase4-governance-community/`** - Governance & Community Tools: governance voting, SUSU, badges, holders, credit builder, group analytics, journey, learn, PMA, rewards, referrals, membership
- **`_archive/phase5-workbook-legacy/`** - Workbook & Legacy: workbook system, wallet demo, wealth dashboard, wealth practice, analytics dashboard, graduation dashboard, transparency dashboard, contact, origin, philosophy, whitepaper, terminal, system
- **`_archive/phase6-admin-tools/`** - Admin Tools: admin pages, investor management, operator portal, partner management
- **`_archive/api/`** - Archived API routes (65+ directories, 300+ files) for features not in active pages. Includes: admin, ai, compliance, cron, denet, discord, dscr, governance, groups, hubs, insurance, investor, keygrow, kyc, land, land-acquisition, land-funds, landowners, leads, lending, membership, mortgage-notes, notes, notifications, onboarding, operator, partner, phase2, phase3, pools, referrals, rewards, savings, social, staking, stewards, treasury, v2, wealth, workbook, yield-vault, and more.

## System Architecture

### UI/UX Decisions
The frontend features a modular, responsive design with white backgrounds and teal, purple, and gold accents. Branding includes "AXIOM" with a golden circular token logo and the tagline "Build Wealth Together, On-Chain." A unified navigation system uses consistent headers and footers.

### Technical Implementations
The core Axiom Protocol Token (AXM) is an ERC20 governance and fee-routing token on Arbitrum One, with a planned migration to Universe Blockchain (L3). The multi-phase Smart Contract Architecture on Arbitrum One covers identity, treasury, staking, emissions, and asset registries, supported by 23 verified smart contracts. The platform offers a Complete DeFi Treasury Suite with self-custody vaults, savings circles, staking, and investment pools, utilizing a HYBRID CUSTODY model.

### System Design Choices
The architecture employs a "Product Factory Approach" for scalability. Arbitrum One is the current blockchain network, with a planned migration to Universe Blockchain (L3). Data management uses PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend includes centralized contract configuration, a dedicated contract service, and chain validation middleware.

### Key Active Features
- DEX V2 Ecosystem (10 mainnet contracts on Arbitrum One)
- Institutional Observer Dashboard (Read-only transparency dashboard at `/observer`)
- Lending Fund (SEC Reg D 506(c) compliant bridge loan fund)
- Axiom Capital Program ($1M dual-asset program at `/pilot` with 8 subpages, 14 PostgreSQL tables, 17 API endpoints, NotificationService with Resend email integration. Two SPVs: Cash Flow Anchor ($600K multifamily) and Appreciation Asset ($350K commercial/industrial). 35/35/20/10 treasury allocation policy. Phase 2 expansion gate scoring. Uses raw SQL via pg.Pool for API routes.)
- Euler V2 AXUSD Lending Markets (External DeFi lending integration on Arbitrum One at vault 0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059. **LOCKED CONFIG** - DO NOT CHANGE vault address or LTV parameters.)
- MIRDT - Market Intelligence & Risk Disclosure Terminal (Probabilistic trend-following analysis for crypto + US equities. 3 PostgreSQL tables: mirdt_setups, mirdt_paper_trades, mirdt_data_snapshots. 5 API endpoints. Data providers: CoinGecko (crypto, free) + Alpha Vantage (equities, API key). Signal engine: 20/50 MA crossover + ATR volatility filter. Paper-trade tracking with P&L calculation. Lexicon guard enforces institutional terminology. Model version: MIRDT-TF-v1.0.)
- Deployment Configuration: Uses VM with standalone output. Build: `npm run build:deploy:clean` (8GB memory, ~144 routes). Run: `npm run start:minimal`. Build reduced from 460+ routes to ~144 by archiving unused API routes to `_archive/api/`.

## External Dependencies
- **Blockchain Networks:** Arbitrum One, Universe Blockchain (L3)
- **Blockchain RPC Provider:** Alchemy API
- **Wallet Integration:** MetaMask SDK
- **Smart Contract Development:** Hardhat, OpenZeppelin Contracts
- **Libraries:** Ethers.js, viem + TypeScript
- **Databases:** PostgreSQL, Neon Database, MongoDB
- **Database Tools:** Drizzle Kit
- **Email Service:** Resend
- **Payment Processing:** Stripe
- **Cloud Storage:** Google Cloud Storage, Storacha (Web3 Storage/IPFS)
- **Auth Provider:** Supabase
- **Google AI Stack:** Gemini AI Integration via Replit AI Integrations (gemini-3-pro-preview, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-image)
- **Property Data:** ATTOM Data, RentCast API, Walk Score API
- **Market Data:** Alpha Vantage (US equities OHLCV), CoinGecko (digital asset OHLCV, free tier)

## MIRDT v1 — Market Intelligence & Risk Disclosure Terminal

### How to Run Scan Locally
```bash
# Scan digital assets only (CoinGecko, ~2.5 min for 20 assets)
curl -X POST "http://localhost:5000/api/mirdt/run-scan?type=crypto" -H "x-scan-key: $MIRDT_SCAN_KEY"

# Scan equities only (Alpha Vantage, ~8 min for 40 assets)
curl -X POST "http://localhost:5000/api/mirdt/run-scan?type=equity" -H "x-scan-key: $MIRDT_SCAN_KEY"

# Scan all assets
curl -X POST "http://localhost:5000/api/mirdt/run-scan?type=all" -H "x-scan-key: $MIRDT_SCAN_KEY"

# Expire old setups
curl -X POST "http://localhost:5000/api/mirdt/mark-expired" -H "x-scan-key: $MIRDT_SCAN_KEY"
```

### Architecture
- **Signal Engine:** `server/services/mirdt/SignalEngine.ts` — 20/50 SMA crossover + ATR14 volatility filter. Model version: MIRDT-TF-v1.0
- **Data Providers:** `server/services/mirdt/CoinGeckoProvider.ts` (7s delay between calls), `server/services/mirdt/AlphaVantageProvider.ts` (12s delay)
- **Lexicon Guard:** `lib/mirdt/lexiconGuard.ts` — Enforces prohibited terminology list per Design Law
- **Database:** 3 tables (mirdt_setups, mirdt_paper_trades, mirdt_data_snapshots), all UUID primary keys
- **API Routes:** pages/api/mirdt/ (run-scan, mark-expired, setups, [id], paper-trades)
- **UI:** pages/mirdt/ (index.tsx, [id].tsx) — Institutional design: serif headings, monospace data, navy palette, no animations

## Axiom Protocol Design Law (BINDING)
All new pages must comply with the Design Law. Key rules:
- **Prohibited terms:** wallet, gas, smart contract, dapp, staking, farming, airdrop, token, mint, burn, swap, slippage, max, trending, hot, moon, ape, yield farming, TVL, DAO, whitepaper, testnet, finality, slashing, bridge, hash, txid, block explorer
- **Required style:** Serif headings, monospace data, navy/forest green/muted gold palette, light mode only, no gradients/shadows/animations
- **Required patterns:** Pagination (no infinite scroll), static values with timestamps (no live tickers), flat solid buttons, inline status (no toast notifications)
- **Component test:** Must look like a legal document, function without animation, be explainable to a regulator, be printable for audits
- **MIRDT pages are the reference implementation** for Design Law compliance

### Design Law Implementation (components/design-law/)
Reusable React component library enforcing the Design Law. All new compliant pages should import from `components/design-law`:

- **PageShell** — Full-page wrapper with serif title, subtitle, timestamp, footer disclosure, `.design-law-root` class
- **DataTable** — Generic typed table with alternating rows, border grid, column alignment, row click handler
- **StatusBadge** — Semantic status text with color mapping (ACTIVE=forest, EXPIRED=gray, ERROR=red, etc.)
- **PaginationControls** — Page navigation with "Showing X–Y of Z" counter
- **DisclosureBlock** — Collapsible risk disclosure panel
- **AuditHeader** — Grid of labeled audit metadata fields (ID, timestamp, model version, etc.)
- **DetailGrid** — Two-column labeled detail layout for setup parameters
- **SectionHeading** — Serif h2 with bottom border
- **FormField / DLInput / DLTextarea / DLSelect** — Form primitives with Design Law styling
- **SolidButton** — Flat solid button (primary/secondary/danger variants, sm/md sizes)

### Design Law CSS (styles/globals.css)
- `.design-law-root` class: forces white bg, disables all animations/transitions/shadows/gradients/border-radius
- Print stylesheet: 10pt, black on white, header group repeat, no-print class support

### Design Law Tailwind Tokens (tailwind.config.js)
- Colors: `dl-navy`, `dl-forest`, `dl-gold`, `dl-gray`, `dl-bg`, `dl-bg-alt`, `dl-border`, `dl-error`
- Fonts: `font-dl-serif` (Georgia stack), `font-dl-mono` (Courier New stack)

### Lexicon Guard (lib/designLaw/lexiconGuard.ts)
- Canonical location: `lib/designLaw/lexiconGuard.ts`
- Re-exported from `lib/mirdt/lexiconGuard.ts` for backward compatibility
- `checkLexicon(text)` returns violations; `isLexiconClean(text)` returns boolean
- `APPROVED_REPLACEMENTS` maps prohibited terms to compliant alternatives
