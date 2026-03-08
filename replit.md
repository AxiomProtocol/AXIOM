# Axiom Protocol - Sovereign Digital-Physical Economy

## Overview
The Axiom Protocol is a governance-first wealth infrastructure focused on land acquisition to build a sovereign digital-physical economy. It aims to be a reference architecture for future sovereign digital-physical economies, emphasizing community governance, a treasury system, and an economic engine. Key capabilities include a governance token (AXM), treasury tools, real estate asset onboarding, DePIN infrastructure, cross-chain interoperability, and sustainability initiatives. The project's core purpose is to build wealth together, on-chain, through self-custody and a non-custodial approach, with a vision to build a new financial operating system for digital-physical economies.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.
- **Navigation system**: The active navigation is the `NAV_ITEMS` array in `components/design-law/navItems.ts` (consumed by `DesignLawLayout.tsx`). Navigation uses grouped dropdowns: About (direct), Disclosure (direct), Community (dropdown: Wealth Practice, Land), Products (dropdown: Property Analysis, Deal Intelligence, Deal Flow, Capital Program, Lending Fund, Exchange, Unified AXUSD, DePIN, Fiat On-Ramp), Intelligence (dropdown: MIRDT, Sentinel, Observer, RE Intelligence), Operations (dropdown: Founder Ops, Proof of Execution, Execution Framework, Capital Accounting, Solvency, All Products), Contact (direct). Dropdowns use click-to-open with outside-click-to-close behavior. Desktop breakpoint is `lg:`.
- **Page structure**: ALL pages now use `<DesignLawLayout>` wrapper from `components/design-law`. This provides: nav header (AXIOM logo, 7 top-level nav items with dropdown menus, Connect Wallet button, mobile hamburger), footer (chain ID, disclaimer, timestamp), and `max-w-7xl mx-auto px-6 py-8` container. New pages must wrap in `<DesignLawLayout>` and use Design Law styling (serif headings, monospace data, dl-* color classes, no rounded corners/shadows/animations/gradients).
- **Institutional vocabulary**: In disclosure-facing content, use allocator-friendly vocabulary: "automated control layers" (not "smart contracts"), "multi-party authorization" (not "multi-sig"), "on-chain financial rails" (not "DeFi"), "asset onboarding/issuance" (not "tokenization"), "participation lockup" (not "staking"). Technical terms are preserved in a glossary on `/disclosure`. GENIUS Act references must say "designed to align with" (not "compliant"). No definitive legal conclusions about token classification. The canonical glossary file is `lib/glossary.ts` — it defines all approved terms, forbidden phrases, maturity labels, and safe replacement patterns.
- **SUSU Rebrand (Feb 2026)**: All user-facing references to "SUSU", "Savings Circle", "ROSCA" have been rebranded to "The Wealth Practice" (formal) or "Wealth Practice" (short). Database table/column names (susu_groups, susu_members, etc.) remain unchanged; route path updated from `/susu` to `/wealth-practice` — only visible labels, headings, descriptions, and copy were updated. The canonical name and definition are in `lib/glossary.ts`. Historical/educational references to the traditional SUSU concept are preserved in Part 1 of the public educational documents.
- **Language hardening rules**: No absolutist positioning ("only platform", "sole platform", "the standard for everyone"). No unqualified physical asset claims (use "pipeline", "framework", "targeted acquisition" instead of specific acreage without evidence). No wealth outcome promises ("make wealthier", "guaranteed returns", "APY" as a claim — use "Variable" for rates). No forbidden characters in new copy (no asterisks or hashtags in body text).
- **Disclosure page**: `/disclosure` is the comprehensive institutional disclosure document. It fetches a single canonical snapshot from `/api/solvency/latest` and derives all headline numbers from that snapshot (treasury, liabilities, coverage ratio, policy mode). Snapshot ID and timestamp is displayed at the top. Definitions section provides formulas for CR, RR, LBR, LD. Unified AXUSD (ERC-3643) migration notice replaces the old dual-ecosystem non-mixing rule. Contract addresses updated to reflect new ERC-3643 system with legacy contracts marked deprecated. Operational status is segmented into Live/Configured-Inactive/Planned.
- **DEPRECATED - Old page structure**: Do NOT use the old dark-themed structure with `<Layout>` wrapper, `bg-black`/`bg-gray-900` backgrounds, or yellow accent colors. Do NOT use bare `<>` fragment wrappers or teal accent colors. All pages must use `<DesignLawLayout>` wrapper.
- **Data sources**: NEVER use hardcoded placeholder data in any new pages. Always fetch real data from blockchain (via services like `CamelotPoolService`), database (PostgreSQL/Drizzle), or external APIs. Use async data fetching patterns with proper loading states and error handling.

## System Architecture

### UI/UX Decisions
The frontend employs a modular, responsive design adhering to the "Axiom Protocol Design Law." This mandates serif headings, monospace data, a navy/forest green/muted gold palette, light mode only, no gradients/shadows/animations, and specific UI patterns like pagination and flat solid buttons. Branding includes "AXIOM" with a golden circular token logo and the tagline "Build Wealth Together, On-Chain." A Lexicon Guard enforces prohibited terms in content.

### Technical Implementations
The core Axiom Protocol Token (AXM) is an ERC20 governance token on Arbitrum One, with a planned migration to Universe Blockchain (L3). The multi-phase Smart Contract Architecture on Arbitrum One includes identity, treasury, staking, emissions, and asset registries, supported by 72 verified smart contracts. The platform offers a Complete DeFi Treasury Suite with self-custody vaults, savings circles, staking, and investment pools, utilizing a HYBRID CUSTODY model. An "Active Contract Verification System" serves as the single source of truth for AXUSD and PSM contract addresses, verified on-chain.

### System Design Choices
The architecture uses a "Product Factory Approach" for scalability. The current blockchain network is Arbitrum One, with a planned migration to Universe Blockchain (L3). Data is managed using PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend features centralized contract configuration, a dedicated contract service, and chain validation middleware.

**Schema file architecture**: New table groups MUST use separate schema files to avoid silent export failures: `shared/distressedFeedSchema.ts` (dp_ tables), `shared/agentGovSchema.ts` (ag_ tables + sentinel regime snapshots mirror), `shared/erc3643Schema.ts` (t3_ tables + t3_kyc_submissions), `shared/lendingFundSchema.ts` (lf_ tables + loan_applications). Always import new tables from their dedicated schema files.

**Key Features:**
- **DEX V2 Ecosystem** and **Institutional Observer Dashboard**.
- **Lending Fund** (SEC Reg D 506(c)) with real SEC Rule 501 accreditation questionnaire, LP dashboard (vault position, TVL, utilization), fund performance metrics, borrower application flow, and admin loan review at `/founder-ops/lending-review`. Schema: `shared/lendingFundSchema.ts`.
- **Euler V2 AXUSD Lending Markets**.
- **MIRDT (Market Intelligence & Risk Disclosure Terminal)** for probabilistic trend-following analysis.
- **Axiom Sentinel**: A unified capital decision and risk authorization layer.
- **Founder Operations Dashboard**: Internal dashboard for System Overview, Capital Allocation, Risk Checkpoints, and Operations Log, including PSM Operations Console.
- **Solvency and Reserve Transparency**: A page (`/solvency`) providing a three-mode institutional solvency console combining live metrics from a database-backed snapshot system with institutional disclosure.
- **Adaptive Metrics Engine (AME)**: A deterministic financial computation engine for regime scoring, policy multipliers, adaptive targets, hard brake triggers, and payout factors.
- **AME AI Oracle**: A Gemini-powered interpretation layer for AME metrics.
- **MIRDT Execution Model**: A deterministic, auditable engine for paper trading based on MIRDT market intelligence setups.
- **Proof of Execution Playbook**: Internal dashboard at `/founder-ops/proof-of-execution` tracking paper trading P&L.
- **The Wealth Practice (Group Economics Core Engine)**: Manages community group economics with a three-stage trust pipeline and capital flow bridge to land acquisition. Pilot Mode banner for Atlanta/Houston/Charlotte. Charter creation with contribution frequency and rotation method. "My Practice" tab showing user's joined groups. API: `/api/wealth-practice/my-groups`.
- **Physical-Digital Bridge (Land Acquisition Pipeline)**: Full land acquisition lifecycle with live governance. Proposal creation, community voting with quorum progress, status lifecycle (draft → active → passed/failed → executed). Pipeline candidates in "Community Vote" stage show their active proposals. API: `/api/land/governance/create`, `/api/land/governance/vote`.
- **Property Analysis Tool**: Pay-per-report property analysis tool at `/property`. Three tiers: Free ($0/3 per month), Base ($4.99), Premium ($14.99). Usage tracking shows remaining free reports. Stripe checkout for paid tiers. Report history at `/property/reports`. Comparison table showing tier differences.
- **Graduated Execution Framework (GEF)**: A behavior-based qualification system at `/execution` for progression from paper trading to live execution.
- **Capital Accounting and Performance Intelligence System**: A full-stack capital ledger, performance computation, and snapshot engine at `/capital`.
- **DeNet DePIN Node Integration**: Provides decentralized storage infrastructure and monitoring.
- **IVCEE (Institutional Viability & Capital Efficiency Engine)**: An allocator-grade underwriting intelligence engine on deal pages.
- **Distressed Property Feed (Deal Flow)**: A deal sourcing pipeline at `/distressed-feed` aggregating distressed properties from government sources (HUD primary, Fannie Mae/Freddie Mac/USDA configured) and a wholesaler submission portal. Expansion sources: tax lien auctions and sheriff sales for GA/TX/NC (manual-only status). Source status indicators on page. 282+ active HUD listings across 8 states.
- **Agent Governance System**: Policy-based autonomous agent authorization at `/api/agent-gov/`.
- **ERC-3643 Unified AXUSD (T-REX Compliant)**: A unified ERC-3643 compliant stablecoin replacing the dual GENIUS/Legacy AXUSD ecosystem. 13 contracts deployed and verified on Arbitrum One. Frontend dashboard at `/axusd-3643` with 4 tabs (Overview, Identity, Compliance, Contracts) — all data fetched live from on-chain via `/api/erc3643/dashboard`. Automated KYC pipeline: submit KYC from dashboard → admin review → auto-bridge to ONCHAINID + claim issuance. Claim expiry system with validity periods (KYC=365d, Sanctions=180d, Accredited=365d), expiry status badges (green/yellow/red), renewal flow. API routes: `/api/erc3643/identity/submit|review|expiry-check|renew|status|register|claim`, `/api/erc3643/compliance/check|modules`, `/api/erc3643/admin/freeze|platform`. Contract config: `shared/contracts-3643.ts`. Schema: `shared/erc3643Schema.ts` (t3_ tables + t3_kyc_submissions).
- **Fiat On-Ramp** (Planned): Placeholder page at `/onramp` with provider evaluation (Transak, Ramp Network, MoonPay, Coinbase Onramp, Mt Pelerin). Research document at `documents/fiat_ramp_research.txt`. Added to Products nav dropdown.
- **Mobile Optimization (Mar 2026)**: All key pages (Deal Flow, Property Analysis, Deal Intelligence, Wealth Practice, About) optimized for 375px+ screens. 44px minimum touch targets, smooth nav transitions, viewport-constrained dropdowns, sticky mobile CTAs, swipe-enabled photo galleries, mobile card layouts replacing tables.

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