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
- **Page structure**: ALL pages now use `<DesignLawLayout>` wrapper from `components/design-law`. This provides: nav header (AXIOM logo, 7 nav links, Access Platform button, mobile hamburger), footer (chain ID, disclaimer, timestamp), and `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8` container. New pages must wrap in `<DesignLawLayout>` and use Design Law styling (serif headings, monospace data, dl-* color classes, no rounded corners/shadows/animations/gradients).
- **DEPRECATED - Old page structure**: Do NOT use the old dark-themed structure with `<Layout>` wrapper, `bg-black`/`bg-gray-900` backgrounds, or yellow accent colors. Do NOT use bare `<>` fragment wrappers or teal accent colors. All pages must use `<DesignLawLayout>` wrapper.
- **Data sources**: NEVER use hardcoded placeholder data in any new pages. Always fetch real data from blockchain (via services like `CamelotPoolService`), database (PostgreSQL/Drizzle), or external APIs. Use async data fetching patterns with proper loading states and error handling.

## System Architecture

### UI/UX Decisions
The frontend features a modular, responsive design with white backgrounds and teal, purple, and gold accents. Branding includes "AXIOM" with a golden circular token logo and the tagline "Build Wealth Together, On-Chain." A unified navigation system uses consistent headers and footers. All new pages must comply with the "Axiom Protocol Design Law," which mandates serif headings, monospace data, navy/forest green/muted gold palette, light mode only, no gradients/shadows/animations, and specific UI patterns like pagination and flat solid buttons. Prohibited terms are enforced by a Lexicon Guard.

### Technical Implementations
The core Axiom Protocol Token (AXM) is an ERC20 governance and fee-routing token on Arbitrum One, with a planned migration to Universe Blockchain (L3). The multi-phase Smart Contract Architecture on Arbitrum One covers identity, treasury, staking, emissions, and asset registries, supported by 23 verified smart contracts. The platform offers a Complete DeFi Treasury Suite with self-custody vaults, savings circles, staking, and investment pools, utilizing a HYBRID CUSTODY model.

### System Design Choices
The architecture employs a "Product Factory Approach" for scalability. Arbitrum One is the current blockchain network, with a planned migration to Universe Blockchain (L3). Data management uses PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend includes centralized contract configuration, a dedicated contract service, and chain validation middleware. Key active features include the DEX V2 Ecosystem, an Institutional Observer Dashboard, a Lending Fund (SEC Reg D 506(c) compliant), the Axiom Capital Program, Euler V2 AXUSD Lending Markets, the MIRDT (Market Intelligence & Risk Disclosure Terminal) for probabilistic trend-following analysis, and **Axiom Sentinel** — the unified capital decision and risk authorization layer.

### Axiom Sentinel (NEW — Feb 2026)
**"Strategy proposes. Sentinel decides. Execution obeys."**

Sentinel is the unified capital decision and risk authorization layer across all Axiom products. It converts MIRDT market intelligence signals into authorized capital actions with cryptographic audit trails.

**Architecture decisions:**
- Control plane: In-app Next.js service (Decision 1: A)
- Job scheduling: Manual API trigger, automate later (Decision 2: C)
- Database: Drizzle + PostgreSQL, existing stack (Decision 3: A)
- Onchain gating: Mixed — onchain for treasury/token, offchain for UI (Decision 4: C)
- Audit: Append-only DB + hash chain, optional onchain anchoring (Decision 5: A)

**Core engines** (`server/services/sentinel/`):
- `RegimeEngine.ts` — Classifies market into TREND_UP, TREND_DOWN, RANGE_LOW_VOL, HIGH_VOL_DISLOCATION
- `ConfidenceCalibrator.ts` — Platt scaling to convert raw confidence to calibrated probability
- `ConfirmationEngine.ts` — Multi-factor confirmation (timeframe alignment, persistence, volume, risk/reward, liquidity)
- `PortfolioEngine.ts` — Vol-targeting position sizing with exposure caps and correlation penalty
- `AuthorizationService.ts` — Issues signed authorization decisions with hash chain
- `AuditLogger.ts` — Append-only audit log with SHA-256 hash chain for integrity verification

**Database tables:** sentinel_signals, sentinel_decisions, sentinel_trades, sentinel_calibration_runs, sentinel_regime_snapshots, sentinel_audit_log

**API routes** (`pages/api/sentinel/`):
- GET: health, overview, signals, decisions, regimes, audit
- POST: run-signals, qualify, allocate, authorize (require x-scan-key auth)

**Dashboard pages:**
- `/sentinel` — Main dashboard (regime, stance, signals, decisions)
- `/sentinel/audit` — Audit trail with hash chain verification

**Signal pipeline:** MIRDT setups → run-signals → qualify → allocate → authorize

**Future phases:** PermissionManager.sol onchain contract, EIP-712 signed decisions, automated scheduling

### Active Contract Verification System (NEW — Feb 2026)
**Single source of truth for AXUSD and PSM contract addresses.**

Two AXUSD ecosystems coexist on Arbitrum One:
1. **GENIUS AXUSD** (`0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C`) — Primary, GENIUS Act compliant, 1M+ supply, 5M PSM ceiling
2. **Original AXUSD** (`0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c`) — Used by Euler Vault + Revenue Router (immutable on-chain binding)

**Source of truth:** `src/config/activeContracts.generated.ts` — auto-generated by `npm run verify:contracts`
**Verification script:** `scripts/verify-active-contracts.js` — queries on-chain state to dynamically select addresses
**Selection rules:** ACTIVE_AXUSD = highest totalSupply; EULER_AXUSD = Euler Vault.asset() return value
**All API endpoints** echo active contract addresses in responses

### Founder Operations Dashboard (NEW — Feb 2026)
**Internal proof-of-concept validation tool for $100/week operational playbook.**

**Dashboard page:** `/founder-ops` — 4-tab dashboard (System Overview, Capital Allocation, Risk Checkpoints, Operations Log)

**API routes** (`pages/api/founder-ops/`):
- GET `/api/founder-ops/overview` — Aggregates live data from Euler, Sentinel, AXUSD, Lending Fund, DEX, Observer with per-source status tracking
- GET `/api/founder-ops/log` — Read operations log entries
- POST `/api/founder-ops/log` — Write operations log (requires x-scan-key auth)

**Database table:** `founder_ops_log` — Tracks weekly operations, failures, fixes, and protocol changes with tx hash references

**6 Mandatory Guard Rails** (embedded in dashboard):
1. Fee Recipient Assumption Check — verify Euler fees non-zero before setFeeReceiver()
2. Revenue Router Accounting Visibility — explicit balance read + event verification
3. ERC4626 Share Math Edge Case — minSharesOut > 0 assertion on first deposit
4. Self-Borrow Risk Contamination — tag all founder loopback tests as non-representative
5. Sentinel Authority Boundary — advisory only until post-public governance vote
6. Property Phase Timing Risk — hard pause if no qualifying property by Week 44

### Deployment SOP (Standard Operating Procedure)
**Last successful deployment: Feb 9, 2026 (commit e6834e30)**

DO NOT deviate from this configuration. It is the only proven working deployment setup.

**Deployment target:** `autoscale`
- NOT `vm` — autoscale is what works for this project

**next.config.js must include:**
```js
output: 'standalone',
```

**package.json scripts (exact):**
```json
"build": "NODE_ENV=production NODE_OPTIONS='--max-old-space-size=8192' next build && mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public",
"start": "HOSTNAME=0.0.0.0 PORT=5000 node .next/standalone/server.js",
```

**.replit deployment section (exact):**
```toml
[deployment]
deploymentTarget = "autoscale"
run = ["npm", "run", "start"]
build = ["npm", "run", "build"]
```

**Port configuration:**
- Next.js standalone listens on `0.0.0.0:5000`
- `.replit` maps internal port 5000 → external port 80
- Port 3000 mapping exists but is unused (do not remove, does not affect deployment)

**Health check endpoints:**
- `/api/health` — lightweight Pages Router endpoint at `pages/api/health.js`, returns `"ok"` HTTP 200
- `/healthz` — Pages Router page at `pages/healthz.js` with `getStaticProps`
- Home page (`/`) uses `getStaticProps` with dynamic import for fast loading

**Critical rules:**
1. NEVER change `deploymentTarget` from `autoscale` to `vm`
2. NEVER remove `output: 'standalone'` from next.config.js
3. NEVER change the `start` script away from `node .next/standalone/server.js`
4. The build script MUST copy `.next/static` and `public` into the standalone directory
5. HOSTNAME must be `0.0.0.0` and PORT must be `5000` in the start command
6. `server-production.js` exists but is NOT used — the standalone server.js is the production entry point

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
- **Market Data:** Alpha Vantage (US equities OHLCV), CoinGecko (digital asset OHLCV)