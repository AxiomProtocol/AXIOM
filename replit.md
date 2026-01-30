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
- **Wealth Engine V2 Contracts** (DeFi Treasury System including AxiomScoreSBT, SusuInsuranceFund, SEED, and AxiomFeeBurner)
- **AXUSD Stablecoin System** (CDP-style hybrid stablecoin with PSM, VaultEngine, Liquidator, BackstopVault, TBillVault, and MarketOperations)
- **AXUSD Ecosystem Integrations** (SusuAXUSDAdapter, KeyGrowPaymentModule, SEEDYieldDistributor, AXUSDRevenueRouter, LiquidityBootstrapper on Arbitrum One mainnet)
- **Land Acquisition System** (SEC Reg CF compliant crowdfunding with tokenized land options, community pooling, and enhanced admin tools)
- **SEC Reg CF Compliance System** (Investor protection with investment limit calculator, KYC, risk disclosures, and audit trail)
- **Closed-Loop Coordination System** (Membership-based coordination with PMA Membership Gate, Purpose Pools, Governance, Land Candidates Pipeline, and Treasury Transparency)
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
- **DEX V2 Ecosystem** (10 mainnet contracts on Arbitrum One)
- **Institutional Observer Dashboard** (Read-only transparency dashboard for allocators and auditors at `/observer`)
- **Euler V2 AXUSD Lending Markets** (External DeFi lending integration on Arbitrum One at vault 0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059 with USDC/USDT/WETH/ARB collateral support, integrated via /earn page, /borrow page, DEX Earn tab, yield-vault page, and dashboard widget)
- **Deployment Configuration**: Uses VM for complex builds, `npm run build:deploy:clean` for build command, and `npm run start:minimal` for run command.

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