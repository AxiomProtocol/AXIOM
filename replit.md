# Axiom Smart City - Sovereign Digital-Physical Economy

## Overview
The Axiom Smart City project aims to establish America's first 1,000-acre on-chain sovereign smart city economy. It operates as a community-governed DeFi protocol with a treasury system and economic engine. Key capabilities include a governance token (AXM), DeFi treasury tools, real estate tokenization, DePIN infrastructure, smart city services, cross-chain interoperability, and sustainability initiatives within a decentralized, community-governed framework. The project's vision is to create a model for future sovereign digital-physical economies, emphasizing a self-custody and non-custodial DeFi approach.

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
-   **Axiom Nodes Marketplace & DEX Exchange**
-   **Governance** (API-based, transitioning to on-chain)
-   **Admin Authentication & RBAC** (JWT-based with two-step approval and audit logging)
-   **AI Agent & Upgrade Framework** (security-first, configurable modes, audit logging, idempotency)
-   **KeyGrow Rent-to-Own Program** (ERC-1155 tokenized fractional property shares)
-   **Axiom SUSU (Rotating Savings Groups)** (on-chain ROSCA with Community Pool and Personal Vault custody)
-   **PMA Trust** (Private Membership Association Trust with tokenized ERC-1155/1400 memberships)
-   **AI Member Support** (Gemini-powered chat assistant)
-   **SEED (Wealth Engine)** (AXM locking for voting power and participation benefits)
-   **On-Chain Credit Score Display** (`CreditScoreCard` with FICO-like visualization)
-   **Steward Corps & Recruitment System** (elite coordination corps with 12-month seasonal training program covering Foundations + Spring/Summer/Fall/Winter quarters, operational dashboard, and land program. Three tiers: Premium $6,000, Standard $3,000, Scholarship $750 with AXUSD graduation rewards.)
-   **Wealth Engine V2 Contracts** (DeFi Treasury System including AxiomScoreSBT, SusuInsuranceFund, SEED, and AxiomFeeBurner)
-   **AXUSD Stablecoin System** (CDP-style hybrid stablecoin with PSM, VaultEngine, Liquidator, BackstopVault, TBillVault, and MarketOperations)
-   **AXUSD Ecosystem Integrations** (SusuAXUSDAdapter, KeyGrowPaymentModule, SEEDYieldDistributor, AXUSDRevenueRouter, LiquidityBootstrapper on Arbitrum One mainnet)
-   **Land Acquisition System** (SEC Reg CF compliant crowdfunding with tokenized land options, community pooling, and enhanced admin tools for property submission, listing import, and multi-stage approval workflow)
-   **Social Campaign & Referral System** (Marketing tools with short links, social sharing, and referral tracking for crowdfunding campaigns)
-   **SEC Reg CF Compliance System** (Investor protection and regulatory compliance with investment limit calculator, KYC verification, required risk disclosures, and full audit trail)
-   **Closed-Loop Coordination System** (Membership-based coordination with PMA Membership Gate, Purpose Pools for resource coordination, a robust Governance System, Land Candidates Pipeline, and Treasury Transparency. All terminology focuses on coordination and participation, with AXUSD for settlement and accounting only.)
-   **Land Reclamation Workbook** (Paid subscription tool for genealogical land research with case management, evidence tracking, AI Research Assistant, and ethical use safeguards.)
-   **Personalized Journeys** (Dashboard customization based on user interests and experience level, smart feature recommendations, goal tracking)
-   **Unified Investor Dashboard** (Tabbed dashboard at /dashboard combining Home, My Investments, and Governance tabs. Home tab shows personalized widgets and stats. My Investments tab displays portfolio positions, yield tracking, distributions, statements, and K-1 tax documents with PDF/CSV export. Governance tab shows proposals, voting interface, voting power stats, and proposal creation. Lazy loading for optimal performance.)
-   **Mobile Dashboard Optimization** (Touch-friendly interfaces, responsive layouts, mobile bottom navigation, swipe gestures)
-   **Community Coordination Marketplace** (SUSU group matching with land opportunities, skill sharing, resource coordination)
-   **Cross-Program Contribution Planner** (Unified financial planning across SUSU, Land, Staking with suggested contribution schedules)
-   **Treasury Risk Dashboard** (Real-time treasury health metrics, stress testing scenarios, risk indicators, alert system)
-   **Security Enhancements** (Rate limiting middleware, audit logging, session management, anomaly detection, input sanitization)
-   **Smart Contract Monitoring** (On-chain activity monitoring dashboard with security event tracking)
-   **Real-Time Intelligence Platform** (Analytics dashboard with treasury metrics, protocol health indicators, configurable alerts system)
-   **AXUSD Liquidity & Treasury Automation** (LP incentive programs, automation rules for harvest/compound/rebalance, cross-chain bridge routes)
-   **AXUSD Advanced Analytics APIs** (6 endpoints: history tracking with growth metrics, wallet position tracking, peg deviation alerts, multi-pool support, LP incentive programs with bonus tiers, cross-chain bridge routes to ETH/Base/Optimism/Polygon)
-   **Land Asset Lifecycle Suite** (6-stage pipeline from discovery to development, due diligence checklists, steward application workflow)
-   **Monetization & Membership Services** (4-tier membership system: Free/Basic/Premium/Enterprise, paywall content, referral program with 10% discount/15% commission)
-   **Incentive & Rewards Economy** (Quest system with XP/badges/AXM rewards, 10-level progression, staking boosts up to +15% APY, community leaderboard)
-   **Compliance Automation** (KYC/AML verification with 3 levels, regulatory transaction limits, immutable audit ledger, compliance reporting)
-   **DePIN & Asset Oracles** (IoT device monitoring, real-time asset price feeds via Chainlink, cross-chain settlement, energy credit tokenization)
-   **AXUSD Real Estate Lending Fund** (SEC Reg D 506(c) compliant fix-and-flip bridge loan fund for accredited investors. 6 deployed contracts on Arbitrum One: RiskConfig, LoanReceiptNFT, FixFlipPoolVault (ERC4626), RepaymentRouter, FixFlipManager, ProductRegistry. 70% max LTV, 14% interest, 10-14% target APY. Entity: Axiom Nexus LLC, Mississippi.)
-   **AXUSD DSCR Rental & BRRRR Loans** (Long-term rental property financing with Debt Service Coverage Ratio underwriting. Contracts: DSCRRiskConfig, DSCRLoanReceiptNFT, DSCRPoolVault (ERC4626), DSCRLoanManager. Three tiers: LOW (65% LTV, 1.25 DSCR, 7% APR), STANDARD (70% LTV, 1.20 DSCR, 8% APR), YIELD (75% LTV, 1.10 DSCR, 9.5% APR). 30-year amortizing terms. BRRRR refinance pathway converts completed fix-and-flip loans to long-term DSCR loans. Off-chain payment posting via Servicer role with referenceHash audit trail.)
-   **DSCR Governance & Reporting System** (4-phase institutional-grade transparency system for SEC Reg D 506(c) compliance. Phase 1: Treasury Transparency Dashboard at /transparency with live AUM, active loans, fund allocation visualization, and 30-second auto-refresh. Phase 2: Investor Reporting Portal at /dscr/investor/reports with position tracking, yield distributions, monthly/quarterly statements, and K-1 tax documents. Phase 3: Governance System MVP at /governance with proposal creation, voting interface, governance stats, and voting power calculations. Phase 4: Compliance & Audit Tools at /admin/compliance with KYC review queue, audit trail filtering, compliance scoring, and regulatory report generation. All APIs provide demo data fallbacks for demonstration purposes.)
-   **Product Roadmap System** (Public roadmap page at /roadmap with timeline and list views, search filtering, and expandable product details. Admin editor at /admin/roadmap with full CRUD for phases, products, and milestones. Dual auth support: JWT admin sessions and ADMIN_EDIT_TOKEN env variable. Three phases covering 8 products: High Yield Savings, Mortgage Notes, Rent Streams, Community Land Funds, Builder/Farmer Credit, AXUSD Credit Lines, Insurance Pools, Treasury Notes. Data stored in data/roadmap.json with publish/draft status control.)
-   **Phase 1 Products - Build the Balance Sheet** (Three foundational capital products launched:
    - Axiom Mortgage Notes at /mortgage-notes: Fractional ownership in performing real estate loans. Shows $2.45M total notes, 18 active notes, 10-14% target APY, 98.2% performing rate. Portfolio of 5 property-backed loans with LTV, interest rates, and payment status.
    - Axiom High Yield Savings at /savings: Vault-style savings with 8.5% current APY. Four tiers (Standard, Silver, Gold, Platinum) with APY boosts up to +1%. $1.85M total deposits, 234 depositors, 78.5% utilization.
    - Axiom Rent Streams at /rent-streams: Tokenized rental income from 8 properties. 6-9% target yield, 94.5% occupancy, $32.5K monthly rent, $285K distributed. Interactive property cards with occupancy, yield, and distribution details.
    All products use JSON data storage, SEC Reg D 506(c) compliance badges, and link to lending-fund onboarding.)

## Enhancement Roadmap
See `docs/ENHANCEMENT_ROADMAP.md` for planned improvements to Land Crowdfunding and LP Incentives features, organized into 6 phases covering wallet integration, AXUSD payments, visual enhancements, interactive features, on-chain actions, and cross-feature integration.

## External Dependencies
-   **Blockchain Networks:** Arbitrum One, Universe Blockchain (L3)
-   **Blockchain RPC Provider:** Alchemy API
-   **Wallet Integration:** MetaMask SDK
-   **Smart Contract Development:** Hardhat, OpenZeppelin Contracts
-   **Libraries:** Ethers.js, viem + TypeScript
-   **Databases:** PostgreSQL, Neon Database, MongoDB
-   **Database Tools:** Drizzle Kit
-   **Email Service:** Resend
-   **Payment Processing:** Stripe
-   **Cloud Storage:** Google Cloud Storage, Storacha (Web3 Storage/IPFS)
-   **Property Data:** ATTOM Data, RentCast API, Walk Score API
-   **Auth Provider:** Supabase
-   **Google AI Stack:** Gemini AI Integration via Replit AI Integrations (gemini-3-pro-preview, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-image)