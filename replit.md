# Axiom Protocol - Sovereign Digital-Physical Economy

## Overview
The Axiom Protocol is a governance-first wealth infrastructure focused on land acquisition to build a sovereign digital-physical economy. It aims to be a reference architecture for future sovereign digital-physical economies, emphasizing community governance, a treasury system, and an economic engine. Key capabilities include a governance token (AXM), treasury tools, real estate asset onboarding, DePIN infrastructure, cross-chain interoperability, and sustainability initiatives. The project's core purpose is to build wealth together, on-chain, through self-custody and a non-custodial approach, with a vision to build a new financial operating system for digital-physical economies.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.
- **Navigation system**: The active navigation is the `NAV_ITEMS` array in `components/design-law/navItems.ts` (consumed by `DesignLawLayout.tsx`). Navigation uses grouped dropdowns: About (direct), Disclosure (direct), Community (dropdown: Wealth Practice, Land), Products (dropdown: Property Analysis, Deal Intelligence, Deal Flow, Capital Program, Lending Fund, Exchange, Unified AXUSD, DePIN, Fiat On-Ramp), Intelligence (dropdown: MIRDT, Sentinel, Observer, RE Intelligence), Operations (dropdown: Founder Ops, Proof of Execution, Execution Framework, Capital Accounting, Solvency, Syndication, All Products), Contact (direct). Dropdowns use click-to-open with outside-click-to-close behavior. Desktop breakpoint is `lg:`.
- **Page structure**: ALL pages now use `<DesignLawLayout>` wrapper from `components/design-law`. This provides: nav header (AXIOM logo, 7 top-level nav items with dropdown menus, Connect Wallet button, mobile hamburger), footer (chain ID, disclaimer, timestamp), and `max-w-7xl mx-auto px-6 py-8` container. New pages must wrap in `<DesignLawLayout>` and use Design Law styling (serif headings, monospace data, dl-* color classes, no rounded corners/shadows/animations/gradients).
- **Institutional vocabulary**: In disclosure-facing content, use allocator-friendly vocabulary: "automated control layers" (not "smart contracts"), "multi-party authorization" (not "multi-sig"), "on-chain financial rails" (not "DeFi"), "asset onboarding/issuance" (not "tokenization"), "participation lockup" (not "staking"). Technical terms are preserved in a glossary on `/disclosure`. GENIUS Act references must say "designed to align with" (not "compliant"). No definitive legal conclusions about token classification. The canonical glossary file is `lib/glossary.ts` — it defines all approved terms, forbidden phrases, maturity labels, and safe replacement patterns.
- **SUSU Rebrand (Feb 2026)**: All user-facing references to "SUSU", "Savings Circle", "ROSCA" have been rebranded to "The Wealth Practice" (formal) or "Wealth Practice" (short). Database table/column names (susu_groups, susu_members, etc.) remain unchanged; route path updated from `/susu` to `/wealth-practice` — only visible labels, headings, descriptions, and copy were updated. The canonical name and definition are in `lib/glossary.ts`. Historical/educational references to the traditional SUSU concept are preserved in Part 1 of the public educational documents.
- **Language hardening rules**: No absolutist positioning ("only platform", "sole platform", "the standard for everyone"). No unqualified physical asset claims (use "pipeline", "framework", "targeted acquisition" instead of specific acreage without evidence). No wealth outcome promises ("make wealthier", "guaranteed returns", "APY" as a claim — use "Variable" for rates). No forbidden characters in new copy (no asterisks or hashtags in body text).
- **Disclosure page**: `/disclosure` is the comprehensive institutional disclosure document. It fetches a single canonical snapshot from `/api/solvency/latest` and derives all headline numbers from that snapshot (treasury, liabilities, coverage ratio, policy mode). Snapshot ID and timestamp is displayed at the top. Definitions section provides formulas for CR, RR, LBR, LD. Unified AXUSD (ERC-3643) migration notice replaces the old dual-ecosystem non-mixing rule. Contract addresses updated to reflect new ERC-3643 system with legacy contracts marked deprecated. Operational status is segmented into Live/Configured-Inactive/Planned.
- **DEPRECATED - Old page structure**: Do NOT use the old dark-themed structure with `<Layout>` wrapper, `bg-black`/`bg-gray-900` backgrounds, or yellow accent colors. Do NOT use bare `<>` fragment wrappers or teal accent colors. All pages must use `<DesignLawLayout>` wrapper.
- **Data sources**: NEVER use hardcoded placeholder data in any new pages. Always fetch real data from blockchain (via services like `CamelotPoolService`), database (PostgreSQL/Drizzle), or external APIs. Use async data fetching patterns with proper loading states and error handling.

## System Architecture

### UI/UX Decisions
The frontend employs a modular, responsive design adhering to the "Axiom Protocol Design Law." This mandates serif headings, monospace data, a navy/forest green/muted gold palette, light mode only, no gradients/shadows/animations, and specific UI patterns like pagination and flat solid buttons. Branding includes "AXIOM" with a golden circular token logo and the tagline "Build Wealth Together, On-Chain."

### Technical Implementations
The core Axiom Protocol Token (AXM) is an ERC20 governance token on Arbitrum One, with a planned migration to Universe Blockchain (L3). The multi-phase Smart Contract Architecture on Arbitrum One includes identity, treasury, staking, emissions, and asset registries, supported by 72 verified smart contracts. The platform offers a Complete DeFi Treasury Suite with self-custody vaults, savings circles, staking, and investment pools, utilizing a HYBRID CUSTODY model. An "Active Contract Verification System" serves as the single source of truth for AXUSD and PSM contract addresses, verified on-chain.

### System Design Choices
The architecture uses a "Product Factory Approach" for scalability. The current blockchain network is Arbitrum One, with a planned migration to Universe Blockchain (L3). Data is managed using PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend features centralized contract configuration, a dedicated contract service, and chain validation middleware.

**Schema file architecture**: New table groups MUST use separate schema files to avoid silent export failures: `shared/distressedFeedSchema.ts` (dp_ tables), `shared/agentGovSchema.ts` (ag_ tables + sentinel regime snapshots mirror), `shared/erc3643Schema.ts` (t3_ tables + t3_kyc_submissions), `shared/lendingFundSchema.ts` (lf_ tables + loan_applications), `shared/docExtractionSchema.ts` (doc_ tables), `shared/dueDiligenceSchema.ts` (dd_ tables), `shared/syndicationSchema.ts` (syn_ tables). Always import new tables from their dedicated schema files.

**Key Features:**
- **DEX V2 Ecosystem** and **Institutional Observer Dashboard**.
- **Lending Fund** (SEC Reg D 506(c)) with LP dashboard, fund performance, and borrower application.
- **Euler V2 AXUSD Lending Markets**.
- **MIRDT (Market Intelligence & Risk Disclosure Terminal)** for probabilistic trend-following analysis.
- **Axiom Sentinel**: A unified capital decision and risk authorization layer.
- **Founder Operations Dashboard**: Internal dashboard for System Overview, Capital Allocation, Risk Checkpoints, Operations Log, and PSM Operations Console.
- **Solvency and Reserve Transparency**: A page (`/solvency`) providing a three-mode institutional solvency console combining live metrics from a database-backed snapshot system with institutional disclosure.
- **Adaptive Metrics Engine (AME)**: A deterministic financial computation engine for regime scoring, policy multipliers, adaptive targets, hard brake triggers, and payout factors.
- **AME AI Oracle**: A Gemini-powered interpretation layer for AME metrics.
- **MIRDT Execution Model**: A deterministic, auditable engine for paper trading based on MIRDT market intelligence setups.
- **Proof of Execution Playbook**: Internal dashboard at `/founder-ops/proof-of-execution` tracking paper trading P&L.
- **The Wealth Practice (Group Economics Core Engine)**: Manages community group economics with a three-stage trust pipeline and capital flow bridge to land acquisition.
- **Physical-Digital Bridge (Land Acquisition Pipeline)**: Full land acquisition lifecycle with live governance including proposal creation, community voting, and status lifecycle.
- **Property Analysis Tool**: Pay-per-report property analysis tool at `/property` with free, base, and premium tiers, including usage tracking and report history.
- **Graduated Execution Framework (GEF)**: A behavior-based qualification system at `/execution` for progression from paper trading to live execution.
- **Capital Accounting and Performance Intelligence System**: A full-stack capital ledger, performance computation, and snapshot engine at `/capital`.
- **DeNet DePIN Node Integration**: Provides decentralized storage infrastructure and monitoring.
- **IVCEE (Institutional Viability & Capital Efficiency Engine)**: An allocator-grade underwriting intelligence engine on deal pages.
- **Document Ingestion & Extraction**: AI-powered document analysis in the Deal Intelligence workspace (Documents tab) supporting various document types, structured data extraction via Gemini, and auto-mapping to deal assumptions.
- **Distressed Property Feed (Deal Flow)**: A deal sourcing pipeline at `/distressed-feed` aggregating distressed properties from government sources and a wholesaler submission portal.
- **Agent Governance System**: Policy-based autonomous agent authorization at `/api/agent-gov/`.
- **ERC-3643 Unified AXUSD (T-REX Compliant)**: A unified ERC-3643 compliant stablecoin with a frontend dashboard at `/axusd-3643` for overview, identity, compliance, and contracts. Includes automated KYC pipeline and claim expiry system.
- **Fiat On-Ramp** (Planned): Placeholder page at `/onramp` for fiat on-ramp provider evaluation.
- **Multi-Exit Strategy Engine**: Provides 8 underwriting strategies (BRRRR, flip, hold, note, multifamily, wholesale, shortTermRental, sellerFinance) with comparison and ranking.
- **Due Diligence Checklist System**: Structured DD workflow with 15 default items across 10 categories, including status and progress tracking.
- **Capital Readiness Card**: Computes capital analysis on deal Metrics tab showing totalCapitalRequired, sponsorContribution, debtAmount, equityGap, and readiness assessment for 5 funding sources.
- **AI Acquisition Memo Builder**: Gemini-powered institutional acquisition memo generator synthesizing deal data into a structured memo.
- **Syndication Module**: Full syndication operating system at `/syndication` with sponsor workspace, offering builder, and various offering types, pipeline stages, and settlement modes.
- **Mobile Optimization**: All key pages optimized for mobile screens (375px+).

## External Dependencies
- **Blockchain Networks:** Arbitrum One, Universe Blockchain (L3)
- **Blockchain RPC Provider:** Alchemy API
- **Wallet Integration:** MetaMask SDK
- **Smart Contract Development:** Hardhat, OpenZeppelin Contracts, @onchain-id/solidity
- **Libraries:** Ethers.js, viem + TypeScript
- **Databases:** PostgreSQL, Neon Database, MongoDB
- **Database Tools:** Drizzle Kit
- **Email Service:** Resend
- **Payment Processing:** Stripe
- **Cloud Storage:** Google Cloud Storage, Storacha (Web3 Storage/IPFS)
- **Auth Provider:** Supabase
- **Google AI Stack:** Gemini AI Integration via Replit AI Integrations (gemini-3-pro-preview, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-image)
- **Property Data:** RentCast API, Walk Score API
- **Market Data:** Alpha Vantage, CoinGecko