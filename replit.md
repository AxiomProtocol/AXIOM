# Axiom Smart City - Sovereign Digital-Physical Economy

## Observation Mode (ACTIVE)

**Status:** OBSERVATION WINDOW ACTIVE  
**Started:** 2026-01-26  
**Minimum Duration:** 2 months (ends 2026-03-26)  
**Optional Extension:** up to 2026-07-26  
**Authoritative Document:** `/docs/governance/AXM-GOV-001-observation-window-rationale.md`

During this window: NO external investments, deposits, or contributions accepted. Admin-only access to internal financial modules.

## Overview
The Axiom Smart City project aims to establish America's first 1,000-acre on-chain sovereign smart city economy. It functions as a community-governed DeFi protocol with a robust treasury system and economic engine. Its core purpose is to create a model for future sovereign digital-physical economies, emphasizing self-custody and a non-custodial DeFi approach. Key capabilities include a governance token (AXM), DeFi treasury tools, real estate tokenization, DePIN infrastructure, smart city services, cross-chain interoperability, and sustainability initiatives within a decentralized, community-governed framework.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.
- **Navigation system**: ALWAYS use the RebuildNav system (`components/axiomRebuild/navConfig.ts`) for new routes. NEVER add routes to the old navigation system (`lib/navigation.js` or `components/Layout.js`). New pages must be added to `REBUILD_NAV_PAGES` in `pages/_app.js` or use the `startsWith()` pattern matching.
- **Data sources**: NEVER use hardcoded placeholder data in any new pages. Always fetch real data from blockchain (via services like `CamelotPoolService`), database (PostgreSQL/Drizzle), or external APIs. Use async data fetching patterns with proper loading states and error handling.

## System Architecture

### UI/UX Decisions
The frontend features a modular, responsive design with a professional gold/black theme and yellow accents. Branding includes "AXIOM" with a golden circular token logo and the tagline "Build Wealth Together, On-Chain." A unified navigation system uses a land-first approach with consistent headers and footers. The official Web3 design template provides an immersive experience with glassmorphism, 3D depth, and scroll animations, utilizing white backgrounds, teal, purple, and gold accents.

### Technical Implementations
The core Axiom Protocol Token (AXM) is an ERC20 governance and fee-routing token on Arbitrum One, with a planned migration to Universe Blockchain (L3). The multi-phase Smart Contract Architecture on Arbitrum One covers identity, treasury, staking, emissions, and asset registries, supported by 23 verified smart contracts. The platform offers a Complete DeFi Treasury Suite with self-custody vaults, savings circles, staking, and investment pools, utilizing a HYBRID CUSTODY model.

### System Design Choices
The architecture employs a "Product Factory Approach" for scalability. Arbitrum One is the current blockchain network, with a planned migration to Universe Blockchain (L3). Data management uses PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend includes centralized contract configuration, a dedicated contract service, and chain validation middleware.

Key features include:
- **Axiom Nodes Marketplace & DEX Exchange**
- **Governance** (On-chain GovernanceHub with 24h timelock, role-based access, and emergency pause)
- **Admin Authentication & RBAC** (JWT-based with two-step approval and audit logging)
- **AI Agent & Upgrade Framework** (security-first, configurable modes, audit logging, idempotency)
- **KeyGrow Rent-to-Own Program** (ERC-1155 tokenized fractional property shares)
- **Axiom SUSU (Rotating Savings Groups)** (on-chain ROSCA with Community Pool and Personal Vault custody)
- **PMA Trust** (Private Membership Association Trust with tokenized ERC-1155/1400 memberships)
- **AI Member Support** (Gemini-powered chat assistant)
- **SEED (Wealth Engine)** (AXM locking for voting power and participation benefits)
- **On-Chain Credit Score Display** (`CreditScoreCard` with FICO-like visualization)
- **Steward Corps & Recruitment System** (elite coordination corps with training program and operational dashboard)
- **Wealth Engine V2 Contracts** (DeFi Treasury System including AxiomScoreSBT, SusuInsuranceFund, SEED, and AxiomFeeBurner)
- **AXUSD Stablecoin System** (CDP-style hybrid stablecoin with PSM, VaultEngine, Liquidator, BackstopVault, TBillVault, and MarketOperations)
- **AXUSD Ecosystem Integrations** (SusuAXUSDAdapter, KeyGrowPaymentModule, SEEDYieldDistributor, AXUSDRevenueRouter, LiquidityBootstrapper on Arbitrum One mainnet)
- **Land Acquisition System** (SEC Reg CF compliant crowdfunding with tokenized land options, community pooling, and enhanced admin tools)
- **Social Campaign & Referral System** (Marketing tools for crowdfunding campaigns)
- **SEC Reg CF Compliance System** (Investor protection with investment limit calculator, KYC, risk disclosures, and audit trail)
- **Closed-Loop Coordination System** (Membership-based coordination with PMA Membership Gate, Purpose Pools, Governance, Land Candidates Pipeline, and Treasury Transparency)
- **Land Reclamation Workbook** (Paid subscription tool for genealogical land research with AI Assistant)
- **Personalized Journeys** (Dashboard customization, smart feature recommendations, goal tracking)
- **Unified Investor Dashboard** (Tabbed dashboard at `/dashboard` for investments, governance, and personalized widgets)
- **Mobile Dashboard Optimization** (Touch-friendly interfaces, responsive layouts, mobile bottom navigation, swipe gestures)
- **Community Coordination Marketplace** (SUSU group matching with land opportunities, skill sharing, resource coordination)
- **Cross-Program Contribution Planner** (Unified financial planning across SUSU, Land, Staking)
- **Treasury Risk Dashboard** (Real-time treasury health metrics, stress testing, risk indicators, alert system)
- **Security Enhancements** (Rate limiting, audit logging, session management, anomaly detection, input sanitization)
- **Smart Contract Monitoring** (On-chain activity monitoring dashboard with security event tracking)
- **Real-Time Intelligence Platform** (Analytics dashboard with treasury metrics, protocol health indicators, configurable alerts system)
- **AXUSD Liquidity & Treasury Automation** (LP incentive programs, automation rules, cross-chain bridge routes)
- **AXUSD Advanced Analytics APIs** (6 endpoints for history, wallet position, peg deviation, multi-pool, LP incentives, cross-chain routes)
- **Land Asset Lifecycle Suite** (6-stage pipeline from discovery to development, due diligence, steward application)
- **Monetization & Membership Services** (4-tier membership system, paywall content, referral program)
- **Incentive & Rewards Economy** (Quest system with XP/badges/AXM rewards, staking boosts, community leaderboard)
- **Compliance Automation** (KYC/AML verification, regulatory transaction limits, immutable audit ledger, compliance reporting)
- **DePIN & Asset Oracles** (IoT device monitoring, real-time asset price feeds via Chainlink, cross-chain settlement, energy credit tokenization)
- **AXUSD Real Estate Lending Fund** (SEC Reg D 506(c) compliant fix-and-flip bridge loan fund for accredited investors, with 6 deployed contracts)
- **AXUSD DSCR Rental & BRRRR Loans** (Long-term rental property financing with Debt Service Coverage Ratio underwriting, including BRRRR refinance pathway)
- **DSCR Governance & Reporting System** (4-phase institutional-grade transparency system for SEC Reg D 506(c) compliance, including Treasury Transparency Dashboard, Investor Reporting Portal, Governance System, and Compliance & Audit Tools)
- **Product Roadmap System** (Public roadmap page and admin editor for managing phases, products, and milestones)
- **Phase 1 Products - Build the Balance Sheet** (Axiom Mortgage Notes, Axiom High Yield Savings, Axiom Rent Streams, all SEC Reg D 506(c) compliant with JSON data storage)
- **Phase 2 Products - Turn Capital Into Infrastructure** (Community Land Funds with MetaMask integration and on-chain transactions; Builder & Farmer Credit for working capital loans via credit application modal)
- **Phase 3 Products - Turn Axiom Into a Financial State** (AXUSD Credit Lines, Insurance Pools, Axiom Treasury Notes, all with Web3 wallet integration and live API data)
- **DEX V2 Ecosystem** (10 mainnet contracts on Arbitrum One: ExchangeHubV2, OracleAdapter, LPStaking, FeeDistributor, TradingRewards, Router, Analytics, LimitOrders, Governor, InsuranceFund. Backend service at `server/services/dex/DexService.ts`, 10 API routes at `pages/api/dex/*`, React hooks at `client/src/hooks/useDex.ts`)
- **Institutional Observer Dashboard** (Read-only transparency dashboard for allocators and auditors at `/observer`. 6 pages: Overview, Treasury, Governance, Risk, Assets, Reports. Live RPC data from Arbitrum One via `ObserverService.ts`. No transaction signing - pure read-only. Docs: `/docs/observer-dashboard-spec.md`, `/docs/observer-events.md`)
- **Deployment Configuration**: Uses VM for complex builds, `npm run build:deploy:clean` for build command, and `npm run start:minimal` for run command. Specific file exclusions are in place to prevent build timeouts due to large asset and Solidity artifact sizes.

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

## Arbitrum 2026 Integration Plan (Phase 4)

**Document:** `/docs/integrations/arbitrum-2026-integration-plan.md`

### During Observation (Q1-Q2 2026)
- **Stylus Smart Contracts:** Port compute-intensive contracts (AxiomScoreSBT, SEEDLock, Liquidator) to Rust for 30%+ gas savings
- **RWA Infrastructure:** Apply for STEP 2.0 grant, assess BlackRock BUIDL integration for treasury backing
- **Timeboost MEV Protection:** Enable for DEX V2 and liquidation transactions

### Post-Observation (Q3 2026+)
- **Universe Blockchain L3:** Launch Axiom's sovereign L3 on Arbitrum Orbit with custom gas tokens (AXM/AXUSD)
- **ArbOS Dia Adoption:** Predictable gas pricing, EIP-7702 account abstraction, gasless onboarding
- **1inch Gasless Swaps:** Enable trading without ETH, AXUSD-only ecosystem experience
- **Institutional Protocols:** Morpho AXUSD market, Euler integration, Maple Finance DSCR syndication

### AXUSD Lending Markets (DEPLOYED 2026-01-29)

**Document:** `/docs/lending/AXM-LEND-001-axusd-lending-markets.md`

**Purpose:** External liquidity without capital deployment - LPs earn yield, borrowers use USDY/USDC as collateral

**Deployer:** `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`

**Euler V2 Vault (LIVE on Arbitrum):**
- AXUSD Lending Vault: `0xFc7145A213833222Eb0e616fDcb95D1746a8c40C`
- Initial Liquidity: 56.5 AXUSD
- IRM: `0xd726F97adA1dD330D3C5e479A79c47Dc63dCA770` (Adaptive Curve)
- Unit of Account: USDC
- Accepted Collateral: USDC (90%), USDY (85%), USDT (90%), WETH (80%), ARB (70%)
- View: https://app.euler.finance/vault/0xFc7145A213833222Eb0e616fDcb95D1746a8c40C?network=arbitrumone

**Morpho Markets (Pending - Morpho Blue not on Arbitrum):**
- AXUSD/USDY: 90% LLTV - Market ID: `0xe0bd68...873ac`
- AXUSD/USDC: 92% LLTV - Market ID: `0x9be349...cc364`
- AXUSD/USTBL: 90% LLTV - Market ID: `0x77c76d...02715`

**Key Discovery:** Morpho Blue core contract is NOT deployed on Arbitrum One (only infrastructure contracts). Euler V2 is fully operational.

**API Endpoints:**
- `/api/lending/overview` - Full status of all markets
- `/api/lending/morpho` - Morpho-specific markets
- `/api/lending/euler` - Euler vaults

**Services:**
- `server/services/lending/MorphoMarketService.ts`
- `server/services/lending/EulerVaultService.ts`

### Institutional Treasury Products

**Document:** `/server/services/treasury/InstitutionalTreasuryService.ts`

Live on-chain monitoring of RWA treasury products on Arbitrum:
- USDY (Ondo): $4.9M TVL, 5.35% APY, no minimum
- USTBL (Spiko): $200M TVL, 4.9% APY, no minimum
- BUIDL (BlackRock): 5.0% APY, $100K minimum
- BENJI (Franklin Templeton): 4.8% APY, $1K minimum

**API:** `/api/treasury/institutional`

### Grant Opportunities
- Stylus Sprint: 5M ARB (Active)
- STEP 2.0 RWA: 35M ARB (Active)
- D.A.O. Grant S3: Ongoing until March 2026
- Audit Subsidy: $14M available
- Alchemy-Arbitrum Fund: $10M

### Key Milestones in roadmap.json Phase 4
- 7 products: Stylus Contracts, RWA Integration, Timeboost, Universe L3, ArbOS Dia, 1inch Gasless, Institutional Protocols
- 21 milestones spanning Q2 2026 through Q1 2027