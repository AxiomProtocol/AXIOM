# Axiom Protocol - Sovereign Digital-Physical Economy

## Overview
The Axiom Protocol is a governance-first wealth infrastructure focused on land acquisition to build a sovereign digital-physical economy. It's a community-governed protocol with a treasury system and economic engine, aiming to be a reference architecture for future sovereign digital-physical economies. Key features include a governance token (AXM), treasury tools, real estate asset onboarding, DePIN infrastructure, cross-chain interoperability, and sustainability initiatives. The project's core purpose is to build wealth together, on-chain, emphasizing self-custody and a non-custodial approach.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.
- **Navigation system**: The active navigation is the `NAV_ITEMS` array in `components/design-law/DesignLawLayout.tsx` (and duplicated in `components/design-law/DesignLawHome.tsx` for the home page). When adding new pages to the nav, update both files. Navigation uses grouped dropdowns: About (direct), Disclosure (direct), Community (dropdown: Wealth Practice, Land), Products (dropdown: Capital Program, Lending Fund, Exchange, DePIN), Intelligence (dropdown: MIRDT, Sentinel, Observer), Operations (dropdown: Founder Ops, Solvency, All Products), Contact (direct). Dropdowns use click-to-open with outside-click-to-close behavior. Desktop breakpoint is `lg:`. The legacy nav files (`navConfig.ts`, `SiteNavModel.ts`, `lib/navigation.js`) exist but are NOT rendered by the current DesignLawLayout.
- **Page structure**: ALL pages now use `<DesignLawLayout>` wrapper from `components/design-law`. This provides: nav header (AXIOM logo, 7 top-level nav items with dropdown menus, Connect Wallet button, mobile hamburger), footer (chain ID, disclaimer, timestamp), and `max-w-7xl mx-auto px-6 py-8` container. New pages must wrap in `<DesignLawLayout>` and use Design Law styling (serif headings, monospace data, dl-* color classes, no rounded corners/shadows/animations/gradients).
- **Institutional vocabulary**: In disclosure-facing content, use allocator-friendly vocabulary: "automated control layers" (not "smart contracts"), "multi-party authorization" (not "multi-sig"), "on-chain financial rails" (not "DeFi"), "asset onboarding/issuance" (not "tokenization"), "participation lockup" (not "staking"). Technical terms are preserved in a glossary on `/disclosure`. GENIUS Act references must say "designed to align with" (not "compliant"). No definitive legal conclusions about token classification. The canonical glossary file is `lib/glossary.ts` — it defines all approved terms, forbidden phrases, maturity labels, and safe replacement patterns.
- **SUSU Rebrand (Feb 2026)**: All user-facing references to "SUSU", "Savings Circle", "ROSCA" have been rebranded to "The Wealth Practice" (formal) or "Wealth Practice" (short). Database table/column names (susu_groups, susu_members, etc.) remain unchanged; route path updated from `/susu` to `/wealth-practice` — only visible labels, headings, descriptions, and copy were updated. The canonical name and definition are in `lib/glossary.ts`. Historical/educational references to the traditional SUSU concept are preserved in Part 1 of the public educational documents.
- **Language hardening rules**: No absolutist positioning ("only platform", "sole platform", "the standard for everyone"). No unqualified physical asset claims (use "pipeline", "framework", "targeted acquisition" instead of specific acreage without evidence). No wealth outcome promises ("make wealthier", "guaranteed returns", "APY" as a claim — use "Variable" for rates). No forbidden characters in new copy (no asterisks or hashtags in body text).
- **Disclosure page**: `/disclosure` is the comprehensive institutional disclosure document. It fetches a single canonical snapshot from `/api/solvency/latest` and derives all headline numbers from that snapshot (treasury, liabilities, coverage ratio, policy mode). Snapshot ID and timestamp is displayed at the top. Definitions section provides formulas for CR, RR, LBR, LD. Dual AXUSD ecosystem non-mixing rule is prominently stated. Operational status is segmented into Live/Configured-Inactive/Planned.
- **DEPRECATED - Old page structure**: Do NOT use the old dark-themed structure with `<Layout>` wrapper, `bg-black`/`bg-gray-900` backgrounds, or yellow accent colors. Do NOT use bare `<>` fragment wrappers or teal accent colors. All pages must use `<DesignLawLayout>` wrapper.
- **Data sources**: NEVER use hardcoded placeholder data in any new pages. Always fetch real data from blockchain (via services like `CamelotPoolService`), database (PostgreSQL/Drizzle), or external APIs. Use async data fetching patterns with proper loading states and error handling.

## System Architecture

### UI/UX Decisions
The frontend employs a modular, responsive design adhering to the "Axiom Protocol Design Law." This mandates serif headings, monospace data, a navy/forest green/muted gold palette, light mode only, no gradients/shadows/animations, and specific UI patterns like pagination and flat solid buttons. Branding includes "AXIOM" with a golden circular token logo and the tagline "Build Wealth Together, On-Chain." A Lexicon Guard enforces prohibited terms in content.

### Technical Implementations
The core Axiom Protocol Token (AXM) is an ERC20 governance token on Arbitrum One, with a planned migration to Universe Blockchain (L3). The multi-phase Smart Contract Architecture on Arbitrum One includes identity, treasury, staking, emissions, and asset registries, supported by 72 verified smart contracts. The platform offers a Complete DeFi Treasury Suite with self-custody vaults, savings circles, staking, and investment pools, utilizing a HYBRID CUSTODY model. An "Active Contract Verification System" serves as the single source of truth for AXUSD and PSM contract addresses, verified on-chain.

### System Design Choices
The architecture uses a "Product Factory Approach" for scalability. The current blockchain network is Arbitrum One, with a planned migration to Universe Blockchain (L3). Data is managed using PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend features centralized contract configuration, a dedicated contract service, and chain validation middleware. Key features include the DEX V2 Ecosystem, an Institutional Observer Dashboard, a Lending Fund (SEC Reg D 506(c) compliant), the Axiom Capital Program, Euler V2 AXUSD Lending Markets, the MIRDT (Market Intelligence & Risk Disclosure Terminal) for probabilistic trend-following analysis, and Axiom Sentinel.

**Axiom Sentinel** is the unified capital decision and risk authorization layer across all Axiom products. It converts MIRDT market intelligence signals into cryptographically auditable authorized capital actions. Its architecture involves an in-app Next.js service as the control plane, manual API triggers, Drizzle + PostgreSQL for data, mixed on-chain/off-chain gating, and an append-only DB with a hash chain for auditing.

The **Founder Operations Dashboard** is an internal tool providing a 4-tab dashboard for System Overview, Capital Allocation, Risk Checkpoints, and Operations Log, including an interactive playbook and 6 mandatory Guard Rails. The Playbook's Operations tab offers a PSM Operations Console for mint/redeem execution and automatic transaction logging.

The **Solvency and Reserve Transparency** page (`/solvency`) provides a three-mode institutional solvency console (Allocator, Clearinghouse, Regulatory) combining live metrics from a database-backed snapshot system with institutional disclosure. It includes capital adequacy metrics, asset composition, stress test scenarios, and policy mode determination.

The **Adaptive Metrics Engine (AME)** is a deterministic financial computation engine with pure-function math for regime scoring, policy multipliers, adaptive targets, hard brake triggers, and payout factors.

The **MIRDT Execution Model** is a deterministic, auditable engine for paper trading based on MIRDT market intelligence setups. It processes setups through a pipeline: price fetching, direction inference, liquidity/regime classification, grade computation, eligibility checks, sizing, entry trigger classification, and decision storage with full trace.

**The Wealth Practice (Group Economics Core Engine):** The `/wealth-practice` page (formerly `/susu`) is the community group economics engine with a three-stage trust pipeline: Interest Hub → Purpose Group → On-Chain Pool. Four tabs: Overview (trust pipeline visualization + key metrics from `/api/wealth-practice/analytics`), Discover (browse hubs and groups with search/filter from `/api/wealth-practice/hubs` and `/api/wealth-practice/groups`, plus "Create Hub" form for users to create new Interest Hubs by city, region, and interest), My Practice (wallet-connected view), Create (form to create new groups via POST to `/api/wealth-practice/groups`). The hubs API supports both GET (list active hubs) and POST (create new hub with hubName, city, region, regionType, interest, description). Joining groups via `/api/wealth-practice/join`. Capital flow bridge connects to land acquisition via `/api/wealth-practice/capital-flow`. Database tables: `susu_interest_hubs`, `susu_purpose_groups`, `susu_purpose_categories`, `susu_group_members`, `susu_analytics_events`. Smart contract: `0x6C69D730327930B49A7997B7b5fb0865F30c95A5` (SUSU Pool on Arbitrum One). Seeded with 10 starter hubs (Atlanta, Houston, DMV, Chicago, Charlotte, Detroit, Jackson MS, Memphis, National Land Stewardship, National Food Security).

**Physical-Digital Bridge (Land Acquisition Pipeline):** The `/land` page shows the full land acquisition lifecycle with four tabs: Pipeline (lifecycle stages visualization with candidate cards from `/api/land/candidates`), Funding Pools (acquisition pools with funding progress from `/api/land/pools`), Governance (community proposals from `/api/land/governance`), Produce & Housing (reservation stats from `/api/land/produce` with produce-to-community pipeline explanation). Pipeline stages: Submission → Due Diligence → Community Vote → Funding → Acquired → Activated. Database tables: `land_candidates`, `land_submissions`, `land_acquisition_pools`, `land_governance_proposals`, `produce_reservations`, `steward_applications`. The Produce tab bridges back to Wealth Practice through participation credits.

The **DeNet DePIN Node Integration** provides decentralized storage infrastructure via DeNet Datakeeper Node, with a dashboard for monitoring node status and storage metrics.

Deployment exclusively uses `autoscale`, with `next.config.js` configured for `standalone` output and `package.json` scripts defining `next dev -p 5000`, `next build`, and `start` using `node .next/standalone/server.js`.

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