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

### National Economic Pilot (8 pages)
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
- National Economic Pilot ($1M dual-asset investment tracking system at `/pilot` with 8 subpages, 14 PostgreSQL tables, 17 API endpoints, NotificationService with Resend email integration. Two SPVs: Cash Flow Anchor ($600K multifamily) and Appreciation Asset ($350K commercial/industrial). 35/35/20/10 treasury allocation policy. Phase 2 expansion gate scoring. Uses raw SQL via pg.Pool for API routes.)
- Euler V2 AXUSD Lending Markets (External DeFi lending integration on Arbitrum One at vault 0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059. **LOCKED CONFIG** - DO NOT CHANGE vault address or LTV parameters.)
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
