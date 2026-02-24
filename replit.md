# Axiom Protocol - Sovereign Digital-Physical Economy

## Overview
The Axiom Protocol is a governance-first wealth infrastructure focused on land acquisition to build a sovereign digital-physical economy. It aims to be a reference architecture for future sovereign digital-physical economies, emphasizing community governance, a treasury system, and an economic engine. Key capabilities include a governance token (AXM), treasury tools, real estate asset onboarding, DePIN infrastructure, cross-chain interoperability, and sustainability initiatives. The project's core purpose is to build wealth together, on-chain, through self-custody and a non-custodial approach.

## User Preferences
- **Communication style**: Simple, everyday language explaining technical concepts.
- **Video scripts**: Always deliver in a plain text code block format (```text```) so the copy button appears for easy one-click copying. No markdown formatting, no scene directions with brackets - just clean, copyable text with the script, caption, and hashtags.
- **Navigation system**: The active navigation is the `NAV_ITEMS` array in `components/design-law/navItems.ts` (consumed by `DesignLawLayout.tsx`). Navigation uses grouped dropdowns: About (direct), Disclosure (direct), Community (dropdown: Wealth Practice, Land), Products (dropdown: Property Analysis, Deal Intelligence, Capital Program, Lending Fund, Exchange, DePIN), Intelligence (dropdown: MIRDT, Sentinel, Observer, RE Intelligence), Operations (dropdown: Founder Ops, Proof of Execution, Execution Framework, Capital Accounting, Solvency, All Products), Contact (direct). Dropdowns use click-to-open with outside-click-to-close behavior. Desktop breakpoint is `lg:`.
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
The architecture uses a "Product Factory Approach" for scalability. The current blockchain network is Arbitrum One, with a planned migration to Universe Blockchain (L3). Data is managed using PostgreSQL with Drizzle ORM and MongoDB for analytics. The backend features centralized contract configuration, a dedicated contract service, and chain validation middleware.

**Key Features:**
- **DEX V2 Ecosystem** and an **Institutional Observer Dashboard**.
- **Lending Fund** (SEC Reg D 506(c) compliant) and the **Axiom Capital Program**.
- **Euler V2 AXUSD Lending Markets**.
- **MIRDT (Market Intelligence & Risk Disclosure Terminal)** for probabilistic trend-following analysis.
- **Axiom Sentinel**: A unified capital decision and risk authorization layer converting MIRDT signals into cryptographically auditable capital actions.
- **Founder Operations Dashboard**: An internal 4-tab dashboard for System Overview, Capital Allocation, Risk Checkpoints, and Operations Log, including a PSM Operations Console.
- **Solvency and Reserve Transparency**: A page (`/solvency`) providing a three-mode institutional solvency console (Allocator, Clearinghouse, Regulatory) combining live metrics from a database-backed snapshot system with institutional disclosure.
- **Adaptive Metrics Engine (AME)**: A deterministic financial computation engine for regime scoring, policy multipliers, adaptive targets, hard brake triggers, and payout factors. AME V2 includes LSR, RSR, VPI, Stability Score, hard brake logic, capital flow waterfall routing, and yield permissioning with SMF.
- **AME AI Oracle**: A Gemini-powered interpretation layer for AME metrics, providing institutional-grade analysis.
- **MIRDT Execution Model**: A deterministic, auditable engine for paper trading based on MIRDT market intelligence setups, processing through a pipeline of price fetching, direction inference, classification, sizing, and decision storage. Includes a hybrid exit system with ATR-based volatility-aware riskStop.
- **Proof of Execution Playbook**: Internal dashboard at `/founder-ops/proof-of-execution` tracking paper trading P&L toward a $100/30-day target. Serves as source of truth for system capability demonstration.
- **The Wealth Practice (Group Economics Core Engine)**: The `/wealth-practice` page manages community group economics with a three-stage trust pipeline and capital flow bridge to land acquisition.
- **Physical-Digital Bridge (Land Acquisition Pipeline)**: The `/land` page visualizes the full land acquisition lifecycle, from submission to activation.
- **Property Analysis Tool**: The `/property` page offers a pay-per-report property analysis tool for real estate investors.
- **Graduated Execution Framework (GEF)**: A behavior-based qualification system at `/execution` enabling users to progress from paper trading to live execution through measurable metrics.
- **Capital Accounting and Performance Intelligence System**: A full-stack capital ledger, performance computation, and snapshot engine at `/capital`.
- **DeNet DePIN Node Integration**: Provides decentralized storage infrastructure and monitoring via DeNet Datakeeper Node.
- **IVCEE (Institutional Viability & Capital Efficiency Engine)**: An allocator-grade underwriting intelligence engine at the IVCEE tab on deal pages with six deterministic analytical modules.
- **Saved AI Advisory Results**: Acquisition Advisory analysis can be saved and auto-loaded on page visit.

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
- **Property Data:** RentCast API (property details, AVM valuations, rental estimates), Walk Score API
- **Market Data:** Alpha Vantage (US equities OHLCV), CoinGecko (digital asset OHLCV)